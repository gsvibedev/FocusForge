/*
  Import/Export validation and sanitization utilities
  These functions parse raw JSON, validate expected shapes, and sanitize text fields safely.
*/

export type Timeframe = 'daily' | 'weekly' | 'monthly';

export interface Limit {
  targetType: 'site' | 'category';
  targetId: string;
  minutes: number;
  timeframe: Timeframe;
  displayName?: string;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  limits?: Limit[];
  advancedRules?: any[];
  urlPatterns?: any[];
  categories?: string[];
  domainCategories?: Record<string, string>;
  userGoals?: any[];
  gamification?: Record<string, any>;
  usageLogs?: any[]; // Added usage logs support
}

const MAX_ARRAY = 1000;
const MAX_TEXT = 2000;
const MAX_JSON_SIZE = 50 * 1024 * 1024; // 50MB max file size
const MAX_NESTING_DEPTH = 10; // Prevent deep object nesting attacks

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g; // ZWSP, ZWNBSP, etc.
const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  /expression\s*\(/gi,
  /eval\s*\(/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi
];

export function stripBomAndZWSP(input: string): string {
  return input.replace(/^\uFEFF/, '').replace(ZERO_WIDTH, '').trim();
}

export function sanitizeText(value: string): string {
  if (typeof value !== 'string') return '';
  
  let s = value.slice(0, MAX_TEXT);
  
  // Apply all XSS pattern removals
  for (const pattern of XSS_PATTERNS) {
    s = s.replace(pattern, '');
  }
  
  // Remove potentially dangerous characters
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x1f\x7f-\x9f]/g, ''); // Control characters
  s = s.replace(/[<>'"&]/g, ''); // HTML-unsafe characters
  
  // Strip BOMs and zero-width characters
  s = stripBomAndZWSP(s);
  
  return s.trim();
}

// Additional validation for object depth to prevent DoS attacks
function validateObjectDepth(obj: unknown, currentDepth = 0): boolean {
  if (currentDepth > MAX_NESTING_DEPTH) {
    return false;
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (!validateObjectDepth(item, currentDepth + 1)) {
        return false;
      }
    }
  } else if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      if (!validateObjectDepth(value, currentDepth + 1)) {
        return false;
      }
    }
  }
  
  return true;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isValidISODate(s: string) {
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function safeArray<T>(arr: unknown, mapper: (v: unknown, i: number) => T | null): T[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const out: T[] = [];
  for (let i = 0; i < Math.min(arr.length, MAX_ARRAY); i++) {
    const v = mapper(arr[i], i);
    if (v !== null) out.push(v);
  }
  return out;
}

function validateLimits(v: unknown): Limit[] | undefined {
  return safeArray<Limit>(v, (item) => {
    if (!isPlainObject(item)) return null;
    const targetType = (item.targetType === 'site' || item.targetType === 'category') ? item.targetType : null;
    const timeframe: Timeframe | null = (item.timeframe === 'daily' || item.timeframe === 'weekly' || item.timeframe === 'monthly') ? item.timeframe : null;

    if (!targetType || !timeframe) return null;

    const minutesNum = clamp(Math.floor(Number(item.minutes)), 0, 10080); // up to 7 days
    const targetId = sanitizeText(String(item.targetId || '')).slice(0, 200);
    const displayName = item.displayName ? sanitizeText(String(item.displayName)).slice(0, 200) : undefined;

    if (!targetId) return null;

    return { targetType, timeframe, minutes: minutesNum, targetId, ...(displayName ? { displayName } : {}) };
  });
}

function validateUrlPatterns(v: unknown): any[] | undefined {
  const allowedTypes = new Set(['contains', 'glob', 'regex']);
  const allowedActions = new Set(['block', 'allow', 'limit']);
  return safeArray<any>(v, (item) => {
    if (!isPlainObject(item)) return null;
    const name = sanitizeText(String(item.name || '')).slice(0, 200);
    const pattern = sanitizeText(String(item.pattern || '')).slice(0, 500);
    const type = allowedTypes.has(String(item.type)) ? String(item.type) : 'contains';
    const action = allowedActions.has(String(item.action)) ? String(item.action) : 'block';
    if (!name || !pattern) return null;
    return { ...item, name, pattern, type, action };
  });
}

function validateCategories(v: unknown): string[] | undefined {
  return safeArray<string>(v, (item) => {
    if (typeof item !== 'string') return null;
    const s = sanitizeText(item).slice(0, 100);
    return s || null;
  });
}

function validateDomainCategories(v: unknown): Record<string, string> | undefined {
  if (!isPlainObject(v)) return undefined;
  const out: Record<string, string> = {};
  const entries = Object.entries(v).slice(0, MAX_ARRAY);
  for (const [k, val] of entries) {
    const key = sanitizeText(String(k)).slice(0, 200);
    if (typeof val !== 'string') continue;
    const value = sanitizeText(val).slice(0, 100);
    if (key && value) out[key] = value;
  }
  return out;
}

function validateAdvancedRules(v: unknown): any[] | undefined {
  return safeArray<any>(v, (item) => {
    if (!isPlainObject(item)) return null;
    
    // Validate required fields for rules
    const id = sanitizeText(String(item.id || '')).slice(0, 50);
    const name = sanitizeText(String(item.name || '')).slice(0, 200);
    const enabled = typeof item.enabled === 'boolean' ? item.enabled : true;
    const priority = clamp(Math.floor(Number(item.priority || 1)), 1, 100);
    
    if (!id || !name) return null;
    
    // Validate schedule if present
    let schedule = null;
    if (item.schedule && isPlainObject(item.schedule)) {
      const sched = item.schedule as any;
      const days = Array.isArray(sched.days) ? sched.days.filter((d: any) => 
        typeof d === 'number' && d >= 0 && d <= 6
      ).slice(0, 7) : [];
      const startTime = typeof sched.startTime === 'string' ? 
        sanitizeText(sched.startTime).slice(0, 10) : '';
      const endTime = typeof sched.endTime === 'string' ? 
        sanitizeText(sched.endTime).slice(0, 10) : '';
      
      if (days.length && startTime && endTime) {
        schedule = { days, startTime, endTime };
      }
    }
    
    // Validate targets if present
    let targets = null;
    if (Array.isArray(item.targets)) {
      targets = item.targets.slice(0, 10).map((target: any) => {
        if (!isPlainObject(target)) return null;
        const type = ['domain', 'category', 'pattern'].includes(target.type) ? target.type : 'domain';
        const value = sanitizeText(String(target.value || '')).slice(0, 200);
        const action = ['block', 'limit', 'allow'].includes(target.action) ? target.action : 'block';
        
        if (!value) return null;
        
        const result: any = { type, value, action };
        if (action === 'limit' && typeof target.limitMinutes === 'number') {
          result.limitMinutes = clamp(Math.floor(target.limitMinutes), 1, 1440);
        }
        return result;
      }).filter(Boolean);
    }
    
    const result: any = { id, name, enabled, priority };
    if (schedule) result.schedule = schedule;
    if (targets && targets.length) result.targets = targets;
    
    // Add timestamps if valid
    if (typeof item.createdAt === 'string' && isValidISODate(item.createdAt)) {
      result.createdAt = new Date(item.createdAt);
    }
    if (typeof item.updatedAt === 'string' && isValidISODate(item.updatedAt)) {
      result.updatedAt = new Date(item.updatedAt);
    }
    
    return result;
  });
}

function validateUserGoals(v: unknown): any[] | undefined {
  return safeArray<any>(v, (item) => {
    if (!isPlainObject(item)) return null;
    
    const id = sanitizeText(String(item.id || '')).slice(0, 50);
    const title = sanitizeText(String(item.title || '')).slice(0, 200);
    const description = sanitizeText(String(item.description || '')).slice(0, 500);
    const type = ['usage_limit', 'streak', 'habit'].includes(item.type) ? item.type : 'usage_limit';
    const completed = typeof item.completed === 'boolean' ? item.completed : false;
    
    if (!id || !title) return null;
    
    const result: any = { id, title, description, type, completed };
    
    // Add creation date if valid
    if (typeof item.createdAt === 'string' && isValidISODate(item.createdAt)) {
      result.createdAt = new Date(item.createdAt);
    }
    
    // Add target and progress if they exist and are valid numbers
    if (typeof item.target === 'number' && !isNaN(item.target)) {
      result.target = clamp(item.target, 0, 10080); // Max 7 days
    }
    if (typeof item.progress === 'number' && !isNaN(item.progress)) {
      result.progress = clamp(item.progress, 0, 10080);
    }
    
    return result;
  });
}

function validateGamification(v: unknown): Record<string, any> | undefined {
  if (!isPlainObject(v)) return undefined;
  
  const result: Record<string, any> = {};
  
  // Validate allowed gamification properties
  const allowedKeys = ['points', 'level', 'streak', 'achievements', 'badges', 'lastDailyBonus'];
  
  for (const key of allowedKeys) {
    if (key in v) {
      const value = (v as any)[key];
      switch (key) {
        case 'points':
        case 'level':
        case 'streak':
          if (typeof value === 'number' && !isNaN(value)) {
            result[key] = clamp(Math.floor(value), 0, 1000000);
          }
          break;
        case 'achievements':
        case 'badges':
          if (Array.isArray(value)) {
            result[key] = value.slice(0, 100).map(item => 
              sanitizeText(String(item)).slice(0, 100)
            ).filter(Boolean);
          }
          break;
        case 'lastDailyBonus':
          if (typeof value === 'string' && isValidISODate(value)) {
            result[key] = value;
          }
          break;
      }
    }
  }
  
  return Object.keys(result).length > 0 ? result : undefined;
}

function validateUsageLogs(v: unknown): any[] | undefined {
  return safeArray<any>(v, (item) => {
    if (!isPlainObject(item)) return null;
    
    const domain = sanitizeText(String(item.domain || '')).slice(0, 253);
    const seconds = clamp(Math.floor(Number(item.seconds || 0)), 0, 86400); // Max 24 hours per log
    const dateKey = sanitizeText(String(item.dateKey || '')).slice(0, 20);
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
    
    // Validate domain format (basic check)
    if (!domain || domain.length < 3 || !domain.includes('.')) return null;
    
    return { domain, seconds, dateKey };
  });
}

export function parseAndValidateImport(raw: string): { updates: Partial<ExportData> } {
  // Size check to prevent memory exhaustion
  if (raw.length > MAX_JSON_SIZE) {
    throw new Error(`File too large. Maximum size allowed is ${Math.round(MAX_JSON_SIZE / 1024 / 1024)}MB.`);
  }

  const cleaned = stripBomAndZWSP(raw);
  if (!cleaned) {
    throw new Error('No data provided');
  }

  // Additional security check for potential malicious patterns
  const lowerCased = cleaned.toLowerCase();
  if (lowerCased.includes('__proto__') || lowerCased.includes('constructor') || lowerCased.includes('prototype')) {
    throw new Error('Invalid data: Contains potentially dangerous object properties');
  }

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch (error) {
    throw new Error('Invalid JSON format. Please check your configuration file.');
  }

  if (!isPlainObject(data)) {
    throw new Error('Invalid export file format. Expected a JSON object.');
  }

  // Validate object depth to prevent DoS attacks
  if (!validateObjectDepth(data)) {
    throw new Error(`Invalid data structure: Object nesting too deep (max ${MAX_NESTING_DEPTH} levels)`);
  }

  const version = typeof data.version === 'string' && data.version.length <= 32 ? data.version : null;
  if (!version) {
    throw new Error('Invalid export file format. Missing or invalid version.');
  }

  const exportedAt = typeof data.exportedAt === 'string' && isValidISODate(data.exportedAt) ? data.exportedAt : null;
  if (!exportedAt) {
    throw new Error("Invalid export file format. This doesn't appear to be a FocusForge export.");
  }

  const updates: Partial<ExportData> = { version, exportedAt };

  // Validate and sanitize all data
  const limits = validateLimits((data as any).limits);
  if (limits && limits.length) updates.limits = limits;

  const advancedRules = validateAdvancedRules((data as any).advancedRules);
  if (advancedRules && advancedRules.length) updates.advancedRules = advancedRules;

  const urlPatterns = validateUrlPatterns((data as any).urlPatterns);
  if (urlPatterns && urlPatterns.length) updates.urlPatterns = urlPatterns;

  const categories = validateCategories((data as any).categories);
  if (categories && categories.length) updates.categories = categories;

  const domainCategories = validateDomainCategories((data as any).domainCategories);
  if (domainCategories && Object.keys(domainCategories).length) updates.domainCategories = domainCategories;

  const userGoals = validateUserGoals((data as any).userGoals);
  if (userGoals && userGoals.length) updates.userGoals = userGoals;

  const gamification = validateGamification((data as any).gamification);
  if (gamification && Object.keys(gamification).length) updates.gamification = gamification;

  const usageLogs = validateUsageLogs((data as any).usageLogs);
  if (usageLogs && usageLogs.length) updates.usageLogs = usageLogs;

  return { updates };
}
