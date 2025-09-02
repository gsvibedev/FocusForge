// Content script to track page visibility changes
// This helps the extension know when content is actually visible to the user

let isTrackingEnabled = false;
let lastVisibilityState = document.visibilityState;

function sendVisibilityUpdate(): void {
	if (!isTrackingEnabled) return;

	const currentVisibility = document.visibilityState;
	const isVisible = currentVisibility === 'visible';

	// Only send update if visibility actually changed
	if (currentVisibility !== lastVisibilityState) {
		console.log(`[VisibilityTracker] Visibility changed: ${lastVisibilityState} -> ${currentVisibility}`);

		chrome.runtime.sendMessage({
			type: 'visibility-changed',
			visible: isVisible,
			visibilityState: currentVisibility,
			url: window.location.href,
			timestamp: Date.now()
		}).catch(error => {
			console.warn('[VisibilityTracker] Failed to send visibility update:', error);
		});

		lastVisibilityState = currentVisibility;
	}
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'enable-visibility-tracking') {
		console.log('[VisibilityTracker] Enabling visibility tracking for tab:', message.tabId);

		if (!isTrackingEnabled) {
			isTrackingEnabled = true;

			// Start monitoring visibility changes
			document.addEventListener('visibilitychange', sendVisibilityUpdate);

			// Send initial visibility state
			sendVisibilityUpdate();

			// Also monitor window focus/blur for additional context
			window.addEventListener('focus', () => {
				console.log('[VisibilityTracker] Window focused');
				sendVisibilityUpdate();
			});

			window.addEventListener('blur', () => {
				console.log('[VisibilityTracker] Window blurred');
				sendVisibilityUpdate();
			});

			// Monitor page unload to ensure final visibility update
			window.addEventListener('beforeunload', () => {
				if (isTrackingEnabled) {
					chrome.runtime.sendMessage({
						type: 'visibility-changed',
						visible: false,
						visibilityState: 'unloaded',
						url: window.location.href,
						timestamp: Date.now()
					}).catch(() => {
						// Ignore errors on unload
					});
				}
			});
		}

		sendResponse({ success: true });
		return true;
	}
});

// Initialize with current visibility state
console.log('[VisibilityTracker] Content script loaded, current visibility:', document.visibilityState);
