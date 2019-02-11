"use strict";
const path = require("path");
const fs = require("fs");
const electron = require("electron");
const tray = require("./trayIcon");
const settings = require("./settings");
const app = electron.app;
const appName = app.getName();
const ipc = electron.ipcMain;
const os = require("os");
const shell = electron.shell;

let binds = settings.value("keyboard"); //Keyboard settings
let win; //Browser window
let quitting = false; //Is application quitting right now
let eNotify = null; //Notifications core
let curTheme = getCurrentTheme();

require("electron-context-menu")({
	prepend: (_, window) => [
		{
			label: "Refresh page",
			click: () => win.reload(),
			visible: window === win
		}
	]
});

// #region Single instance lock

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
}

app.on("second-instance", () => {
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
	const lastWindowState = settings.value("lastWindowState");

	const brWin = new electron.BrowserWindow({
		title: app.getName(),
		show: false,
		x: lastWindowState.x,
		y: lastWindowState.y,
		width: lastWindowState.width,
		height: lastWindowState.height,
		icon: process.platform === "linux" && path.join(__dirname, "static/Icon.png"),
		minWidth: 800,
		minHeight: 700,
		titleBarStyle: "hidden-inset",
		frame: false,
		backgroundColor: "#fff",
		webPreferences: {
			preload: path.join(__dirname, "browser.js"),
			nodeIntegration: false,
			plugins: true
		}
	});

	if (process.platform === "darwin") {
		brWin.setSheetOffset(40);
	}

	brWin.loadURL("https://radio.yandex.ru/");

	brWin.on("close", e => {
		const winbehavior = settings.value("window").controlsBehavior;
		if (quitting || winbehavior.indexOf("trayOnClose") === -1)
			app.quit();
		else {
			e.preventDefault();

			if (process.platform === "darwin")
				app.hide();
			else
				brWin.hide();
		}
	});

	brWin.on("minimize", function (event) {
		const winbehavior = settings.value("window").controlsBehavior;
		if (winbehavior.indexOf("trayOnMinimize") === -1) return;
		event.preventDefault();
		brWin.hide();
	});

	brWin.on("page-title-updated", e => {
		e.preventDefault();
	});

	return brWin;
}

function directoryExists(directory) {
	if (!directory)
		return false;
	if (typeof directory !== "string")
		throw new TypeError("directory-exists expects a non-empty string as its first argument");
	try {
		return fs.statSync(path.resolve(directory)).isDirectory();
	} catch (e) {
		return false;
	}
}

function loadCustomTheme(page) {
	const dirPath = settings.value("window.customThemePath");
	if (!directoryExists(dirPath)) return false; //Directory is not valid
	const dir = fs.readdirSync(dirPath); //I think I'll use sync methods in css loading..
	if (dir.length === 0)
		return false;
	let found = false;
	for (const filePath of dir) {
		if (filePath.endsWith(".css")) {
			page.insertCSS(fs.readFileSync(path.join(dirPath, filePath), "utf8"));
			found = true;
		}
	}
	return found;
}

function getCurrentTheme() {
	const useCustom = settings.value("window.useCustom").indexOf("true") !== -1;
	if (useCustom)
		return "custom";
	return settings.value("window.theme").indexOf("true") !== -1 ? "dark" : "white";
}

function updateTheme() {
	const theme = getCurrentTheme();
	if (theme !== curTheme) {
		curTheme = theme;
		win.reload();
	}
}

function updateNotifyConfig() { //It doesn't help..
	//const enableDark = settings.value("window.theme").indexOf("true") !== -1;
	const whiteCfg = {
		//appIcon: path.join(__dirname, "static/icon.png"),
		displayTime: 4000,
		defaultStyleContainer: {
			backgroundColor: "#f0f0f0",
			overflow: "hidden",
			padding: 8,
			border: "1px solid #CCC",
			fontFamily: "Arial",
			fontSize: 12,
			position: "relative",
			lineHeight: "15px"
		},
		defaultStyleAppIcon: {
			overflow: "hidden",
			float: "left",
			height: 40,
			width: 40,
			marginRight: 10
		},
		defaultStyleImage: {
			overflow: "hidden",
			float: "right",
			height: 40,
			width: 40,
			marginLeft: 10
		},
		defaultStyleClose: {
			position: "absolute",
			top: 1,
			right: 3,
			fontSize: 11,
			color: "#CCC"
		},
		defaultStyleText: {
			margin: 0,
			overflow: "hidden",
			cursor: "default"
		}
	};
	//const darkCfg = {
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
	//};
	eNotify.setConfig(whiteCfg);
}

app.on("ready", () => {
	//Check integrity of settings file
	settings.verifySettings();

	//Removing default application menu
	electron.Menu.setApplicationMenu(null);

	//Creating browser window
	win = createMainWindow();

	//Setup notifications
	eNotify = require("electron-notify");
	updateNotifyConfig();

	//Creating tray
	tray.create(win, app, eNotify);

	// #region Register global shortcuts

	if (binds.mute !== "")
		electron.globalShortcut.register(binds.mute, () => win.send("mute"));
	if (binds.play !== "")
		electron.globalShortcut.register(binds.play, () => win.send("play"));
	if (binds.next !== "")
		electron.globalShortcut.register(binds.next, () => win.send("next"));
	if (binds.like !== "")
		electron.globalShortcut.register(binds.like, () => win.send("like"));
	if (binds.dislike !== "")
		electron.globalShortcut.register(binds.dislike, () => win.send("dislike"));

	// #endregion Register global shortcuts

	const page = win.webContents;
	const argv = require("minimist")(process.argv.slice(1));

	page.on("dom-ready", () => {
		switch (curTheme) {
			case "white":
				page.insertCSS(fs.readFileSync(path.join(__dirname, "browserWhite.css"), "utf8"));
				break;
			case "dark":
				page.insertCSS(fs.readFileSync(path.join(__dirname, "browserDark.css"), "utf8"));
				break;
			case "custom":
				if (!loadCustomTheme(page))
					page.insertCSS(fs.readFileSync(path.join(__dirname, "browserWhite.css"), "utf8"));
				break;
			default: page.insertCSS(fs.readFileSync(path.join(__dirname, "browserWhite.css"), "utf8"));
		}
		if (argv.minimize)
			win.minimize();
		else
			win.show();
	});

	const session = electron.session;

	session.defaultSession.webRequest.onBeforeRequest(["*://*./*"], function (details, callback) {
		const whitelist = /file:\/\/\/|chrome-devtools|avatars.yandex.net|yapic.yandex.ru|avatars.mds.yandex.net|.ttf|.woff|registration-validations|passport-frontend|storage.yandex.net|music.yandex.ru|radio.yandex.ru|jquery.min.js|jquery-ui.min.js|.css/gi;

		if (whitelist.test(details.url)) {
			callback({ cancel: false });
		}
		else {
			const nodeConsole = require("console");
			const mainConsole = new nodeConsole.Console(process.stdout, process.stderr);
			mainConsole.log(`Blocked: ${details.url}`);
			callback({ cancel: true });
		}
	});
});

app.on("activate", () => win.show());

app.on("before-quit",
	() => {
		quitting = true;

		//Unbind keyboard shortcuts
		if (binds.mute !== "")
			electron.globalShortcut.unregister(binds.mute);
		if (binds.play !== "")
			electron.globalShortcut.unregister(binds.play);
		if (binds.next !== "")
			electron.globalShortcut.unregister(binds.next);
		if (binds.like !== "")
			electron.globalShortcut.unregister(binds.like);
		if (binds.dislike !== "")
			electron.globalShortcut.unregister(binds.dislike);

		//Save current window bounds
		if (!win.isFullScreen()) {
			const bounds = win.getBounds();
			if (bounds.width < 800)
				bounds.width = 800;
			if (bounds.height < 700)
				bounds.height = 700;
			settings.value("lastWindowState", bounds);
		}

		//Cleaning up notifications
		eNotify.closeAll();
	});

settings.on("save",
	(preferences) => {
		updateTheme();
		//Overgovnokod, I'm too lazy to think how to fix this.. Mb dropdown with key list + some chechboxes with super keys?..
		if (binds.mute !== preferences.keyboard.mute) {
			const toRemove = preferences.keyboard.mute === "";
			if (binds.mute !== "" || toRemove)
				electron.globalShortcut.unregister(binds.mute);
			if (!toRemove)
				try {
					electron.globalShortcut.register(preferences.keyboard.mute, () => win.send("mute"));
				} catch (e) {
					settings.value("keyboard.mute", binds.mute);
					if (binds.mute !== "")
						electron.globalShortcut.register(binds.mute, () => win.send("mute"));
				}
		}
		if (binds.play !== preferences.keyboard.play) {
			const toRemove = preferences.keyboard.play === "";
			if (binds.play !== "" || toRemove)
				electron.globalShortcut.unregister(binds.play);
			if (!toRemove)
				try {
					electron.globalShortcut.register(preferences.keyboard.play, () => win.send("play"));
				} catch (e) {
					settings.value("keyboard.play", binds.play);
					if (binds.play !== "")
						electron.globalShortcut.register(binds.play, () => win.send("play"));
				}
		}
		if (binds.next !== preferences.keyboard.next) {
			const toRemove = preferences.keyboard.next === "";
			if (binds.next !== "" || toRemove)
				electron.globalShortcut.unregister(binds.next);
			if (!toRemove)
				try {
					electron.globalShortcut.register(preferences.keyboard.next, () => win.send("next"));
				} catch (e) {
					settings.value("keyboard.next", binds.next);
					if (binds.next !== "")
						electron.globalShortcut.register(binds.next, () => win.send("next"));
				}
		}
		if (binds.like !== preferences.keyboard.like) {
			const toRemove = preferences.keyboard.like === "";
			if (binds.like !== "" || toRemove)
				electron.globalShortcut.unregister(binds.like);
			if (!toRemove)
				try {
					electron.globalShortcut.register(preferences.keyboard.like, () => win.send("like"));
				} catch (e) {
					settings.value("keyboard.like", binds.like);
					if (binds.like !== "")
						electron.globalShortcut.register(binds.like, () => win.send("like"));
				}
		}
		if (binds.dislike !== preferences.keyboard.dislike) {
			const toRemove = preferences.keyboard.dislike === "";
			if (binds.dislike !== "" || toRemove)
				electron.globalShortcut.unregister(binds.dislike);
			if (!toRemove)
				try {
					electron.globalShortcut.register(preferences.keyboard.dislike, () => win.send("dislike"));
				} catch (e) {
					settings.value("keyboard.dislike", binds.dislike);
					if (binds.dislike !== "")
						electron.globalShortcut.register(binds.dislike, () => win.send("dislike"));
				}
		}
		if (binds.increaseVolume !== preferences.keyboard.increaseVolume) {
			const toRemove = preferences.keyboard.increaseVolume === "";
			if (binds.increaseVolume !== "" || toRemove)
				electron.globalShortcut.unregister(binds.increaseVolume);
			if (!toRemove)
				try {
					electron.globalShortcut.register(preferences.keyboard.increaseVolume, () => win.send("increaseVolume"));
				} catch (e) {
					settings.value("keyboard.increaseVolume", binds.increaseVolume);
					if (binds.increaseVolume !== "")
						electron.globalShortcut.register(binds.increaseVolume, () => win.send("increaseVolume"));
				}
		}
		if (binds.decreaseVolume !== preferences.keyboard.decreaseVolume) {
			const toRemove = preferences.keyboard.decreaseVolume === "";
			if (binds.decreaseVolume !== "" || toRemove)
				electron.globalShortcut.unregister(binds.decreaseVolume);
			if (!toRemove)
				try {
					electron.globalShortcut.register(preferences.keyboard.decreaseVolume, () => win.send("decreaseVolume"));
				} catch (e) {
					settings.value("keyboard.decreaseVolume", binds.decreaseVolume);
					if (binds.decreaseVolume !== "")
						electron.globalShortcut.register(binds.decreaseVolume, () => win.send("decreaseVolume"));
				}
		}
		binds = settings.value("keyboard");
	});

ipc.on("issueReport",
	() => {
		const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->

-

${app.getName()} ${app.getVersion()}
Electron ${process.versions.electron}
${process.platform} ${process.arch} ${os.release()}`;

		shell.openExternal(`https://git.teiko.studio/SilverIce/yaradio/issues/new?issue[description]=${encodeURIComponent(body)}`);
	});

ipc.on("showAbout",
	() => {
		electron.dialog.showMessageBox({
			title: `About ${appName}`,
			message: `${appName} ${app.getVersion()}`,
			detail: "Made with ❤ by Silve",
			icon: path.join(__dirname, "static/Icon.png")
		});
	});

ipc.on("showSettings", () => settings.show());

ipc.on("trackChanged",
	(_, [author, track, preview]) => {
		tray.setTrayTooltip(track + " by " + author);
		const enableNotifications = settings.value("notifications.enable").indexOf("true") !== -1;
		if (!enableNotifications) return;
		const showPreviews = settings.value("notifications.showPreviews").indexOf("true") !== -1;
		const delay = settings.value("notifications.displayTime");
		//updateNotifyConfig(); //Fix "display: 'none'" style on image dom element through rebuilding notify page
		eNotify.notify(
			{
				title: author,
				text: track,
				image: showPreviews ? preview : null,
				displayTime: delay,
				onClickFunc: (notification) => {
					const fullTrack = track + " by " + author;
					electron.clipboard.writeText(fullTrack);
					notification.closeNotification();
					eNotify.notify(
						{
							title: "Copied to clipboard",
							image: path.join(__dirname, "static/Icon.png"),
							text: fullTrack,
							displayTime: 1500
						});
				}
			}
		);
	});

ipc.on("stateChanged",
	(_, state) => { //TODO: make better icons, those are too small
		tray.setTrayIcon(state ? path.join(__dirname, "static/Icon_small.png") : path.join(__dirname, "static/Icon_pause.png"));
	});

exports.getBrowserWindow = () => win;
exports.element = settings.value("element");
