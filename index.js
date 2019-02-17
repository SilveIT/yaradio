'use strict';
const {
	join,
	resolve
} = require('path');
const {
	statSync,
	readdirSync,
	readFileSync
} = require('fs');
const {
	app,
	ipcMain,
	shell,
	BrowserWindow,
	Menu,
	globalShortcut,
	session,
	dialog,
	clipboard
} = require('electron');
const {
	create,
	setTrayTooltip,
	setTrayIcon
} = require('./trayIcon.js');
const settings = require('./settings');
const appName = app.getName();
const ipc = ipcMain;
const {
	release
} = require('os');

// Check integrity of settings file
settings.verifySettings();

let binds = settings.value('keyboard'); // Keyboard settings
let win; // Browser window
let quitting = false; // Is application quitting right now
let eNotify = null; // Notifications core
let curTheme = getCurrentTheme();

require('electron-context-menu')({
	prepend: (_, window) => [{
		label: 'Refresh page',
		click: () => win.reload(),
		visible: window === win
	}]
});

// #region Single instance lock

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
}

app.on('second-instance', () => {
	// Someone tried to run a second instance, we should focus our window.
	if (win) {
		if (win.isMinimized())
			win.restore();
		else if (!win.isVisible())
			win.show();
		win.focus();
	}
});

// #endregion Single instance lock

function createMainWindow() {
	const lastWindowState = settings.value('lastWindowState');

	const brWin = new BrowserWindow({
		title: app.getName(),
		show: false,
		x: lastWindowState.x,
		y: lastWindowState.y,
		width: lastWindowState.width,
		height: lastWindowState.height,
		icon: process.platform === 'linux' && join(__dirname, 'static/Icon.png'),
		minWidth: 800,
		minHeight: 700,
		titleBarStyle: 'hidden-inset',
		frame: false,
		backgroundColor: '#fff',
		webPreferences: {
			preload: join(__dirname, 'browser.js'),
			nodeIntegration: false,
			plugins: true
		}
	});

	if (process.platform === 'darwin') {
		brWin.setSheetOffset(40);
	}

	brWin.loadURL('https://radio.yandex.ru/');

	brWin.on('close', e => {
		const winbehavior = settings.value('window').controlsBehavior;
		if (quitting || winbehavior.indexOf('trayOnClose') === -1)
			app.quit();
		else {
			e.preventDefault();

			if (process.platform === 'darwin')
				app.hide();
			else
				brWin.hide();
		}
	});

	brWin.on('minimize', function (event) {
		const winbehavior = settings.value('window').controlsBehavior;
		if (winbehavior.indexOf('trayOnMinimize') === -1) return;
		event.preventDefault();
		brWin.hide();
	});

	brWin.on('page-title-updated', e => {
		e.preventDefault();
	});

	return brWin;
}

function directoryExists(directory) {
	if (!directory)
		return false;
	if (typeof directory !== 'string')
		throw new TypeError('directory-exists expects a non-empty string as its first argument');
	try {
		return statSync(resolve(directory)).isDirectory();
	} catch (e) {
		return false;
	}
}

function loadCustomTheme(page) {
	const dirPath = settings.value('window.customThemePath');
	if (!directoryExists(dirPath)) return false; // Directory is not valid
	const dir = readdirSync(dirPath); // I think I'll use sync methods in css loading..
	if (dir.length === 0)
		return false;
	let found = false;
	for (const filePath of dir) {
		if (filePath.endsWith('.css')) {
			page.insertCSS(readFileSync(join(dirPath, filePath), 'utf8'));
			found = true;
		}
	}

	return found;
}

function getCurrentTheme() {
	const useCustom = settings.value('window.useCustom').indexOf('true') !== -1;
	if (useCustom)
		return 'custom';
	return settings.value('window.theme').indexOf('true') === -1 ? 'white' : 'dark';
}

function updateTheme() {
	const theme = getCurrentTheme();
	if (theme !== curTheme) {
		curTheme = theme;
		win.reload();
	}
}

function updateNotifyConfig() {
	// const enableDark = settings.value("window.theme").indexOf("true") !== -1;
	const whiteCfg = {
		// appIcon: path.join(__dirname, "static/icon.png"),
		displayTime: 4000,
		defaultStyleContainer: {
			backgroundColor: '#f0f0f0',
			overflow: 'hidden',
			padding: 8,
			border: '1px solid #CCC',
			fontFamily: 'Arial',
			fontSize: 12,
			position: 'relative',
			lineHeight: '15px'
		},
		defaultStyleAppIcon: {
			overflow: 'hidden',
			float: 'left',
			height: 40,
			width: 40,
			marginRight: 10
		},
		defaultStyleImage: {
			overflow: 'hidden',
			float: 'right',
			height: 40,
			width: 40,
			marginLeft: 10
		},
		defaultStyleClose: {
			position: 'absolute',
			top: 1,
			right: 3,
			fontSize: 11,
			color: '#CCC'
		},
		defaultStyleText: {
			margin: 0,
			overflow: 'hidden',
			cursor: 'default'
		}
	};
	// const darkCfg = {
	//	//appIcon: path.join(__dirname, "static/icon.png"),
	//	displayTime: 4000,
	//	defaultStyleContainer: {
	//		backgroundColor: "#f0f0f0",
	//		overflow: "hidden",
	//		padding: 8,
	//		border: "1px solid #CCC",
	//		fontFamily: "Arial",
	//		fontSize: 12,
	//		position: "relative",
	//		lineHeight: "15px",
	//		filter: "invert(1)"
	//	},
	//	defaultStyleAppIcon: {
	//		overflow: "hidden",
	//		float: "left",
	//		height: 40,
	//		width: 40,
	//		marginRight: 10,
	//		filter: "invert(1)"
	//	},
	//	defaultStyleImage: {
	//		overflow: "hidden",
	//		float: "right",
	//		height: 40,
	//		width: 40,
	//		marginLeft: 10,
	//		filter: "invert(1)"
	//	},
	//	defaultStyleClose: {
	//		position: "absolute",
	//		top: 1,
	//		right: 3,
	//		fontSize: 11,
	//		color: "#CCC"
	//	},
	//	defaultStyleText: {
	//		margin: 0,
	//		overflow: "hidden",
	//		cursor: "default"
	//	}
	// };
	eNotify.setConfig(whiteCfg);
}

app.on('ready', () => {
	// Removing default application menu
	Menu.setApplicationMenu(null);

	// Creating browser window
	win = createMainWindow();

	// Setup notifications
	eNotify = require('electron-notify');
	updateNotifyConfig();

	// Creating tray
	create(win, app, eNotify);

	// #region Register global shortcuts

	if (binds.mute !== '')
		globalShortcut.register(binds.mute, () => win.send('mute'));
	if (binds.play !== '')
		globalShortcut.register(binds.play, () => win.send('play'));
	if (binds.next !== '')
		globalShortcut.register(binds.next, () => win.send('next'));
	if (binds.like !== '')
		globalShortcut.register(binds.like, () => win.send('like'));
	if (binds.dislike !== '')
		globalShortcut.register(binds.dislike, () => win.send('dislike'));
	if (binds.increaseVolume !== '')
		globalShortcut.register(binds.increaseVolume, () => win.send('increaseVolume'));
	if (binds.decreaseVolume !== '')
		globalShortcut.register(binds.decreaseVolume, () => win.send('decreaseVolume'));

	// #endregion Register global shortcuts

	const page = win.webContents;
	const argv = require('minimist')(process.argv.slice(1));

	page.on('dom-ready', () => {
		switch (curTheme) {
			case 'white':
				page.insertCSS(readFileSync(join(__dirname, 'browserWhite.css'), 'utf8'));
				break;
			case 'dark':
				page.insertCSS(readFileSync(join(__dirname, 'browserDark.css'), 'utf8'));
				break;
			case 'custom':
				if (!loadCustomTheme(page))
					page.insertCSS(readFileSync(join(__dirname, 'browserWhite.css'), 'utf8'));
				break;
			default:
				page.insertCSS(readFileSync(join(__dirname, 'browserWhite.css'), 'utf8'));
		}

		if (argv.minimize)
			win.minimize();
		else
			win.show();
	});

	session.defaultSession.webRequest.onBeforeRequest(['*://*./*'], function (details, callback) {
		const whitelist = /file:\/\/\/|chrome-devtools|avatars.yandex.net|yapic.yandex.ru|avatars.mds.yandex.net|.ttf|.woff|registration-validations|passport-frontend|storage.yandex.net|music.yandex.ru|radio.yandex.ru|jquery.min.js|jquery-ui.min.js|.css/gi;

		if (whitelist.test(details.url)) {
			callback({
				cancel: false
			});
		} else {
			const nodeConsole = require('console');
			const mainConsole = new nodeConsole.Console(process.stdout, process.stderr);
			mainConsole.log(`Blocked: ${details.url}`);
			callback({
				cancel: true
			});
		}
	});
});

app.on('activate', () => win.show());

app.on('before-quit',
	() => {
		quitting = true;

		// Unbind keyboard shortcuts
		if (binds.mute !== '')
			globalShortcut.unregister(binds.mute);
		if (binds.play !== '')
			globalShortcut.unregister(binds.play);
		if (binds.next !== '')
			globalShortcut.unregister(binds.next);
		if (binds.like !== '')
			globalShortcut.unregister(binds.like);
		if (binds.dislike !== '')
			globalShortcut.unregister(binds.dislike);

		// Save current window bounds
		if (!win.isFullScreen()) {
			const bounds = win.getBounds();
			if (bounds.width < 800)
				bounds.width = 800;
			if (bounds.height < 700)
				bounds.height = 700;
			settings.value('lastWindowState', bounds);
		}

		// Cleaning up notifications
		eNotify.closeAll();
	});

function updateBinds(preferences) {
	// Overgovnokod, I'm too lazy to think how to fix this.. Mb dropdown with key list + some chechboxes with super keys?..
	if (binds.mute !== preferences.keyboard.mute) {
		const toRemove = preferences.keyboard.mute === '';
		if (binds.mute !== '' || toRemove)
			globalShortcut.unregister(binds.mute);
		if (!toRemove)
			try {
				globalShortcut.register(preferences.keyboard.mute, () => win.send('mute'));
			} catch (e) {
				settings.value('keyboard.mute', binds.mute);
				if (binds.mute !== '')
					globalShortcut.register(binds.mute, () => win.send('mute'));
			}
	}

	if (binds.play !== preferences.keyboard.play) {
		const toRemove = preferences.keyboard.play === '';
		if (binds.play !== '' || toRemove)
			globalShortcut.unregister(binds.play);
		if (!toRemove)
			try {
				globalShortcut.register(preferences.keyboard.play, () => win.send('play'));
			} catch (e) {
				settings.value('keyboard.play', binds.play);
				if (binds.play !== '')
					globalShortcut.register(binds.play, () => win.send('play'));
			}
	}

	if (binds.next !== preferences.keyboard.next) {
		const toRemove = preferences.keyboard.next === '';
		if (binds.next !== '' || toRemove)
			globalShortcut.unregister(binds.next);
		if (!toRemove)
			try {
				globalShortcut.register(preferences.keyboard.next, () => win.send('next'));
			} catch (e) {
				settings.value('keyboard.next', binds.next);
				if (binds.next !== '')
					globalShortcut.register(binds.next, () => win.send('next'));
			}
	}

	if (binds.like !== preferences.keyboard.like) {
		const toRemove = preferences.keyboard.like === '';
		if (binds.like !== '' || toRemove)
			globalShortcut.unregister(binds.like);
		if (!toRemove)
			try {
				globalShortcut.register(preferences.keyboard.like, () => win.send('like'));
			} catch (e) {
				settings.value('keyboard.like', binds.like);
				if (binds.like !== '')
					globalShortcut.register(binds.like, () => win.send('like'));
			}
	}

	if (binds.dislike !== preferences.keyboard.dislike) {
		const toRemove = preferences.keyboard.dislike === '';
		if (binds.dislike !== '' || toRemove)
			globalShortcut.unregister(binds.dislike);
		if (!toRemove)
			try {
				globalShortcut.register(preferences.keyboard.dislike, () => win.send('dislike'));
			} catch (e) {
				settings.value('keyboard.dislike', binds.dislike);
				if (binds.dislike !== '')
					globalShortcut.register(binds.dislike, () => win.send('dislike'));
			}
	}

	if (binds.increaseVolume !== preferences.keyboard.increaseVolume) {
		const toRemove = preferences.keyboard.increaseVolume === '';
		if (binds.increaseVolume !== '' || toRemove)
			globalShortcut.unregister(binds.increaseVolume);
		if (!toRemove)
			try {
				globalShortcut.register(preferences.keyboard.increaseVolume, () => win.send('increaseVolume'));
			} catch (e) {
				settings.value('keyboard.increaseVolume', binds.increaseVolume);
				if (binds.increaseVolume !== '')
					globalShortcut.register(binds.increaseVolume, () => win.send('increaseVolume'));
			}
	}

	if (binds.decreaseVolume !== preferences.keyboard.decreaseVolume) {
		const toRemove = preferences.keyboard.decreaseVolume === '';
		if (binds.decreaseVolume !== '' || toRemove)
			globalShortcut.unregister(binds.decreaseVolume);
		if (!toRemove)
			try {
				globalShortcut.register(preferences.keyboard.decreaseVolume, () => win.send('decreaseVolume'));
			} catch (e) {
				settings.value('keyboard.decreaseVolume', binds.decreaseVolume);
				if (binds.decreaseVolume !== '')
					globalShortcut.register(binds.decreaseVolume, () => win.send('decreaseVolume'));
			}
	}

	binds = settings.value('keyboard');
}

settings.on('save',
	preferences => {
		updateTheme();
		updateBinds(preferences);
	});

ipc.on('issueReport',
	() => {
		const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->

-

${app.getName()} ${app.getVersion()}
Electron ${process.versions.electron}
${process.platform} ${process.arch} ${release()}`;

		shell.openExternal(`https://git.teiko.studio/SilverIce/yaradio/issues/new?issue[description]=${encodeURIComponent(body)}`);
	});

ipc.on('showAbout',
	() => {
		dialog.showMessageBox({
			title: `About ${appName}`,
			message: `${appName} ${app.getVersion()}`,
			detail: 'Made with ❤ by Silve',
			icon: join(__dirname, 'static/Icon.png')
		});
	});

ipc.on('showSettings', () => settings.show());

ipc.on('trackChanged',
	(_, [author, track, preview]) => {
		setTrayTooltip(track + ' by ' + author);
		const enableNotifications = settings.value('notifications.enable').indexOf('true') !== -1;
		if (!enableNotifications) return;
		const showPreviews = settings.value('notifications.showPreviews').indexOf('true') !== -1;
		const delay = settings.value('notifications.displayTime');
		eNotify.notify({
			title: author,
			text: track,
			image: showPreviews ? preview : null,
			displayTime: delay,
			onClickFunc: notification => {
				const fullTrack = track + ' by ' + author;
				clipboard.writeText(fullTrack);
				notification.closeNotification();
				eNotify.notify({
					title: 'Copied to clipboard',
					image: join(__dirname, 'static/Icon.png'),
					text: fullTrack,
					displayTime: 1500
				});
			}
		});
	});

ipc.on('stateChanged',
	(_, state) => {
		setTrayIcon(state ? join(__dirname, 'static/Icon_small.png') : join(__dirname, 'static/Icon_pause.png'));
	});

exports.getBrowserWindow = function () {
	return win;
};

exports.element = settings.value('element');
