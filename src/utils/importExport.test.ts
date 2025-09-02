import { describe, it, expect } from 'vitest';
import { parseAndValidateImport } from './importExport';

function isoNow() {
  return new Date().toISOString();
}

describe('parseAndValidateImport', () => {
  it('parses minimal valid export and keeps known keys only', () => {
    const raw = JSON.stringify({
      version: '1.0.0',
      exportedAt: isoNow(),
      limits: [
        { targetType: 'site', targetId: 'example.com', minutes: 30, timeframe: 'daily' }
      ],
      unknownKey: 'should be ignored'
    });

    const { updates } = parseAndValidateImport(raw);
    expect(updates.version).toBe('1.0.0');
    expect(typeof updates.exportedAt).toBe('string');
    expect(updates).not.toHaveProperty('unknownKey');
    expect(updates.limits?.length).toBe(1);
    expect(updates.limits?.[0]).toMatchObject({
      targetType: 'site',
      targetId: 'example.com',
      timeframe: 'daily',
    });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseAndValidateImport('{ bad json ')).toThrow(/Invalid JSON format/);
  });

  it('throws when version is missing', () => {
    const raw = JSON.stringify({ exportedAt: isoNow() });
    expect(() => parseAndValidateImport(raw)).toThrow(/Missing or invalid version/);
  });

  it("throws when exportedAt is missing or invalid", () => {
    const raw = JSON.stringify({ version: '1.0.0', exportedAt: 'not-a-date' });
    expect(() => parseAndValidateImport(raw)).toThrow(/doesn't appear to be a FocusForge export/);
  });

  it('sanitizes dangerous text fields', () => {
    const raw = JSON.stringify({
      version: '1.0.0',
      exportedAt: isoNow(),
      limits: [
        { targetType: 'site', targetId: '<script>alert(1)</script>example.com', minutes: 15, timeframe: 'daily' }
      ],
      urlPatterns: [
        { name: 'Bad', pattern: 'javascript:alert(1)', type: 'glob', action: 'block' }
      ]
    });

    const { updates } = parseAndValidateImport(raw);
    expect(updates.limits?.[0].targetId).toContain('example.com');
    expect(updates.urlPatterns?.[0].pattern).not.toContain('javascript:');
  });

  it('caps array sizes to prevent abuse', () => {
    const many = Array.from({ length: 1200 }, (_, i) => ({ targetType: 'site', targetId: `s${i}.com`, minutes: 1, timeframe: 'daily' }));
    const raw = JSON.stringify({
      version: '1.0.0',
      exportedAt: isoNow(),
      limits: many
    });

    const { updates } = parseAndValidateImport(raw);
    expect(updates.limits?.length).toBeLessThanOrEqual(1000);
  });
});
