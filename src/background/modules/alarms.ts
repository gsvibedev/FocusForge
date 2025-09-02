/* eslint-disable no-console */
import { LimitsStore } from '../../storage/limitsStore';

const ALARM_NAME_RESET = 'focusforge:reset';

function scheduleDailyReset(): void {
	chrome.alarms.clear(ALARM_NAME_RESET, () => {
		chrome.alarms.create(ALARM_NAME_RESET, { when: Date.now() + 60_000, periodInMinutes: 60 });
	});
}

export function initializeAlarms(): void {
	chrome.alarms.onAlarm.addListener(async (alarm) => {
		if (alarm.name === ALARM_NAME_RESET) {
			await LimitsStore.rolloverPeriodsIfNeeded();
			console.log('[FocusForge] Periodic limit reset executed');
		}
	});

	chrome.runtime.onInstalled.addListener(() => scheduleDailyReset());
	chrome.runtime.onStartup.addListener(() => scheduleDailyReset());
}




