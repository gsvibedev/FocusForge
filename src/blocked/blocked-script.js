console.log('[BlockedPage] Script loaded');

const optionsBtn = document.getElementById('options');
const snoozeBtn = document.getElementById('snooze5');
const logoImg = document.getElementById('logo');

if (!optionsBtn || !snoozeBtn) {
    console.error('[BlockedPage] Buttons not found!');
} else {
    console.log('[BlockedPage] Buttons found, setting up event listeners');
}

// Set logo source via extension URL with enhanced white background removal
try {
    if (logoImg && chrome?.runtime?.getURL) {
        // Add class for enhanced white background removal
        logoImg.classList.add('no-white-bg');
        
        // Try icon-128.png first (likely has better transparency)
        logoImg.src = chrome.runtime.getURL('icons/icon-128.png');
        
        logoImg.onerror = () => {
            try { 
                // Fallback to assets logo
                logoImg.src = chrome.runtime.getURL('assets/logo.png');
                console.log('[BlockedPage] Using fallback logo from assets');
            } catch (e) {
                console.warn('[BlockedPage] Failed to load fallback logo:', e);
            }
        };
        
        logoImg.onload = () => {
            console.log('[BlockedPage] Logo loaded successfully');
            // Additional processing to ensure white background removal
            logoImg.style.imageRendering = 'crisp-edges';
        };
    }
} catch (e) {
    console.warn('[BlockedPage] Error setting up logo:', e);
}

// Helper to get original URL to return to
function getOriginalUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const from = params.get('from');
        if (from) {
            console.log('[BlockedPage] Found original URL from parameter:', from);
            return from;
        }
    } catch {}
    
    // If no 'from' parameter, try to extract from referrer
    const referrer = document.referrer;
    if (referrer && !referrer.startsWith('chrome-extension://')) {
        console.log('[BlockedPage] Using referrer as original URL:', referrer);
        return referrer;
    }
    
    // If still no URL, try to reconstruct from current blocked page context
    // This handles cases where DNR redirected without parameters
    try {
        const currentUrl = window.location.href;
        const match = currentUrl.match(/chrome-extension:\/\/[^/]+\/src\/blocked\/index\.html/);
        if (match) {
            // Try to get the domain that was likely blocked
            // We can't perfectly reconstruct, but we can make educated guesses
            console.log('[BlockedPage] No original URL found, will use fallback behavior');
            return '';
        }
    } catch {}
    
    console.log('[BlockedPage] No original URL could be determined');
    return '';
}

// Adjust Limits button
optionsBtn?.addEventListener('click', async () => {
    try {
        console.log('[BlockedPage] Opening options page...');
        optionsBtn.textContent = 'Opening...';
        optionsBtn.disabled = true;
        
        // Try to open options page
        if (chrome?.runtime?.openOptionsPage) {
            await chrome.runtime.openOptionsPage();
            console.log('[BlockedPage] Options page opened successfully');
        } else {
            // Fallback: open in new tab
            console.log('[BlockedPage] Using fallback method');
            const optionsUrl = chrome.runtime.getURL('src/options/index.html');
            window.open(optionsUrl, '_blank');
        }
        
        // Close current tab after a short delay
        setTimeout(() => {
            window.close();
        }, 1000);
    } catch (error) {
        console.error('[BlockedPage] Error opening options:', error);
        optionsBtn.textContent = 'Adjust Limits';
        optionsBtn.disabled = false;
        
        // Final fallback: try opening in same tab
        try {
            const optionsUrl = chrome.runtime.getURL('src/options/index.html');
            window.location.href = optionsUrl;
        } catch (e) {
            console.error('[BlockedPage] All fallbacks failed:', e);
        }
    }
});

// Snooze 5 min button
snoozeBtn?.addEventListener('click', async () => {
    try {
        console.log('[BlockedPage] Starting 5-minute snooze...');
        snoozeBtn.textContent = 'Snoozing...';
        snoozeBtn.disabled = true;
        
        // Send snooze message to background
        const response = await chrome.runtime.sendMessage({ 
            type: 'set-global-snooze', 
            payload: { minutes: 5 } 
        });
        
        console.log('[BlockedPage] Snooze response:', response);
        // Write UI-friendly snooze data for popup feedback
        const endTime = Date.now() + (5 * 60 * 1000);
        await chrome.storage.local.set({
            globalSnooze: {
                until: endTime,
                originalMinutes: 5,
                source: 'blocked-page'
            }
        });

        // Show success and redirect back after longer delay to ensure rules are rebuilt
        snoozeBtn.textContent = 'Snoozed! Redirecting...';
        const target = getOriginalUrl();
        
        // Wait longer and verify snooze is actually active before redirecting
        const redirectAfterSnoozeVerification = async () => {
            try {
                // Multiple verification attempts to ensure snooze is properly set
                let attempts = 0;
                const maxAttempts = 3;
                const verifySnooze = async () => {
                    const result = await chrome.storage.local.get(['blockSnoozeUntil']);
                    const snoozeUntil = result.blockSnoozeUntil || 0;
                    const bufferTime = 5000; // 5 second buffer for safety
                    
                    if (snoozeUntil > (Date.now() + bufferTime)) {
                        console.log('[BlockedPage] Snooze verified active with buffer, redirecting to:', target);
                        if (target && !target.startsWith('chrome-extension://')) {
                            window.location.href = target;
                        } else {
                            // If no target URL, try to get the blocked domain from storage
                            // and redirect to it (this handles DNR redirects without 'from' parameter)
                            try {
                                chrome.storage.local.get(['lastBlockedDomain'], (result) => {
                                    const lastDomain = result.lastBlockedDomain;
                                    if (lastDomain) {
                                        console.log('[BlockedPage] Redirecting to last blocked domain:', lastDomain);
                                        window.location.href = `https://${lastDomain}`;
                                    } else if (window.history.length > 1) {
                                        history.back();
                                    } else {
                                        window.close();
                                    }
                                });
                            } catch (e) {
                                console.warn('[BlockedPage] Could not get last blocked domain:', e);
                                if (window.history.length > 1) {
                                    history.back();
                                } else {
                                    window.close();
                                }
                            }
                        }
                        return true;
                    }
                    return false;
                };
                
                // Try verification with retries
                while (attempts < maxAttempts) {
                    if (await verifySnooze()) return;
                    attempts++;
                    if (attempts < maxAttempts) {
                        console.log(`[BlockedPage] Snooze verification attempt ${attempts} failed, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
                console.warn('[BlockedPage] Snooze verification failed after all attempts');
                snoozeBtn.textContent = 'Snooze failed - Try again';
                snoozeBtn.disabled = false;
            } catch (e) {
                console.warn('[BlockedPage] Redirect verification failed, closing tab', e);
                window.close();
            }
        };
        
        // Wait 2 seconds for rule rebuild and state propagation to complete
        setTimeout(redirectAfterSnoozeVerification, 2000);
        
    } catch (error) {
        console.error('[BlockedPage] Error setting snooze:', error);
        snoozeBtn.textContent = 'Error - Try again';
        snoozeBtn.disabled = false;
    }
});

// Check if already snoozed on page load
const checkSnoozeStatus = async () => {
    try {
        const result = await chrome.storage.local.get(['blockSnoozeUntil']);
        const snoozeUntil = result.blockSnoozeUntil || 0;
        const bufferTime = 5000; // 5 second buffer for safety
        
        if (snoozeUntil > (Date.now() + bufferTime)) {
            console.log('[BlockedPage] Already snoozed with buffer, redirecting back');
            // Already snoozed, go back to the original site
            const target = getOriginalUrl();
            // Give more time for rules to be rebuilt and state to propagate
            setTimeout(() => {
                try {
                    if (target && !target.startsWith('chrome-extension://')) {
                        window.location.href = target;
                    } else {
                        // If no target URL, try to get the blocked domain from storage
                        chrome.storage.local.get(['lastBlockedDomain'], (result) => {
                            const lastDomain = result.lastBlockedDomain;
                            if (lastDomain) {
                                console.log('[BlockedPage] Auto-redirecting to last blocked domain:', lastDomain);
                                window.location.href = `https://${lastDomain}`;
                            } else if (window.history.length > 1) {
                                history.back();
                            } else {
                                window.close();
                            }
                        });
                    }
                } catch (e) {
                    console.warn('[BlockedPage] Auto-redirect failed, closing tab', e);
                    window.close();
                }
            }, 1200); // Increased delay for better reliability
        }
    } catch (error) {
        console.error('[BlockedPage] Error checking snooze status:', error);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkSnoozeStatus);
} else {
    checkSnoozeStatus();
}

