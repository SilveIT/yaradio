process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
(async function () {
	globalThis.electron = require('electron');
	//globalThis.electron.app.commandLine.appendSwitch('disable-site-isolation-trials');
	await import('./index.mjs');
})();
