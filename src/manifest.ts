import type { ManifestV3Export } from '@crxjs/vite-plugin';

const manifest: ManifestV3Export = {
	manifest_version: 3,
	name: 'FocusForge',
	version: '1.0.0',
	description:
		'🎯 Boost focus with smart website blocking, time limits, and gamified tracking. Master productivity with AI-powered insights!',
	permissions: [
		'tabs',
		'storage',
		'notifications',
		'declarativeNetRequest',
		'declarativeNetRequestFeedback',
		'declarativeNetRequestWithHostAccess',
		'webNavigation',
		'alarms',
		'idle'
	],
	host_permissions: ['<all_urls>'],
	background: {
		service_worker: 'src/background/index.ts',
		type: 'module'
	},
	action: {
		default_popup: 'src/popup/index.html',
		default_title: 'FocusForge - Focus & Productivity Tracker',
		default_icon: {
			'16': 'icons/icon-16.png',
			'32': 'icons/icon-32.png',
			'48': 'icons/icon-48.png',
			'128': 'icons/icon-128.png'
		}
	},
	options_page: 'src/options/index.html',
	icons: {
		'16': 'icons/icon-16.png',
		'32': 'icons/icon-32.png',
		'48': 'icons/icon-48.png',
		'128': 'icons/icon-128.png'
	},
	web_accessible_resources: [
		{
			resources: ['blocked/index.html', 'blocked/style.css', 'blocked/blocked-script.js', 'assets/logo.png'],
			matches: ['<all_urls>']
		}
	],
	content_security_policy: {
		extension_pages: "script-src 'self'; object-src 'none'; connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https://*.gstatic.com https://www.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self'; frame-src 'none'; worker-src 'none'; base-uri 'none';"
	},
	// Extension metadata will be added when we have a real homepage
};

export default manifest;


