"use strict";
const path = require("path");
const fs = require("fs");
const electron = require("electron");
const menu = require("./menu");
const ctxMenu = require("./trayIcon");
const settings = require("./settings");
const app = electron.app;

let binds = settings.value("keyboard");

require("electron-context-menu")({
	prepend: () => [
		{
			label: "Refresh page",
			click: () => win.reload()
		}
	]
});

let win;
let quitting = false;

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

function createMainWindow() {
	const lastWindowState = settings.value("lastWindowState");

	const win = new electron.BrowserWindow({
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
		//autoHideMenuBar: true,
		backgroundColor: "#fff",
		webPreferences: {
			preload: path.join(__dirname, "browser.js"),
			nodeIntegration: false,
			plugins: true
		}
	});

	if (process.platform === "darwin") {
		win.setSheetOffset(40);
	}

	win.loadURL("https://radio.yandex.ru/");

	win.on("close", e => {
		const winbehavior = settings.value("window").controlsBehavior;
		if (quitting || winbehavior.indexOf("trayOnClose") === -1)
			app.quit();
		else {
			e.preventDefault();

			if (process.platform === "darwin")
				app.hide();
			else
				win.hide();
		}
	});

	win.on("minimize", function (event) {
		const winbehavior = settings.value("window").controlsBehavior;
		if (winbehavior.indexOf("trayOnMinimize") === -1) return;
		event.preventDefault();
		win.hide();
	});

	win.on("page-title-updated", e => {
		e.preventDefault();
	});

	return win;
}

app.on("ready", () => {
	win = createMainWindow();
	menu.create(win);
	ctxMenu.create(win, app);

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

	const page = win.webContents;
	const argv = require("minimist")(process.argv.slice(1));

	page.on("dom-ready", () => {
		page.insertCSS(fs.readFileSync(path.join(__dirname, "browser.css"), "utf8"));

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

app.on("before-quit", () => {
	quitting = true;

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

	if (!win.isFullScreen()) {
		const bounds = win.getBounds();
		if (bounds.width < 800)
			bounds.width = 800;
		if (bounds.height < 700)
			bounds.height = 700;
		settings.value("lastWindowState", bounds);
	}
});

settings.on("save", (preferences) => { //Overgovnokod, I'm too lazy to think how to fix this.. Mb dropdown with key list + some chechboxes with super keys?..
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
	binds = settings.value("keyboard");
});

exports.element = settings.value("element");
