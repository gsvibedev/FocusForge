import React from 'react';

interface KeyboardShortcutsOptions {
	onTabSwitch?: (tabIndex: number) => void;
	onEscape?: () => void;
	onHelp?: () => void;
	enabled?: boolean;
}

export function useKeyboardShortcuts({
	onTabSwitch,
	onEscape,
	onHelp,
	enabled = true
}: KeyboardShortcutsOptions = {}): void {
	React.useEffect(() => {
		if (!enabled) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			// Don't trigger shortcuts when user is typing in inputs
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement ||
				(event.target as HTMLElement)?.contentEditable === 'true'
			) {
				return;
			}

			// Tab switching with Alt + Number
			if (event.altKey && onTabSwitch) {
				const num = parseInt(event.key);
				if (num >= 1 && num <= 3) {
					event.preventDefault();
					onTabSwitch(num - 1);
				}
			}

			// Escape key
			if (event.key === 'Escape' && onEscape) {
				event.preventDefault();
				onEscape();
			}

			// Help with F1 or ?
			if ((event.key === 'F1' || event.key === '?') && onHelp) {
				event.preventDefault();
				onHelp();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onTabSwitch, onEscape, onHelp, enabled]);
}

export function useAccessibleFocus(): {
	focusFirstElement: () => void;
	focusLastElement: () => void;
	trapFocus: (containerRef: React.RefObject<HTMLElement>) => void;
} {
	const focusFirstElement = React.useCallback(() => {
		const firstFocusable = document.querySelector<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		firstFocusable?.focus();
	}, []);

	const focusLastElement = React.useCallback(() => {
		const focusableElements = document.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		const lastElement = focusableElements[focusableElements.length - 1];
		lastElement?.focus();
	}, []);

	const trapFocus = React.useCallback((containerRef: React.RefObject<HTMLElement>) => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Tab' || !containerRef.current) return;

			const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			
			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (event.shiftKey && document.activeElement === firstElement) {
				event.preventDefault();
				lastElement?.focus();
			} else if (!event.shiftKey && document.activeElement === lastElement) {
				event.preventDefault();
				firstElement?.focus();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	return { focusFirstElement, focusLastElement, trapFocus };
}






















