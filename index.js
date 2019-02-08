"use strict";
const path = require("path");
const fs = require("fs");
const electron = require("electron");
const menu = require("./menu");
const ctxMenu = require("./contextMenu");
const config = require("./config");

const app = electron.app;

//require('electron-debug')({enabled: true});
//require('electron-context-menu')();

let win;
let isQuitting = false;

const isAlreadyRunning = app.makeSingleInstance(() => {
	if (win) {
		if (win.isMinimized()) {
			win.restore();
		}

		win.show();
	}
});

if (isAlreadyRunning) {
	app.quit();
}

const binds = config.get("binds");

function createMainWindow() {
	const lastWindowState = config.get("lastWindowState");

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
		autoHideMenuBar: true,
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
		if (!isQuitting) {
			e.preventDefault();

			if (process.platform === "darwin") {
				app.hide();
			} else {
				win.hide();
			}
		}
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
	if (binds.mute !== "") {
		electron.globalShortcut.register(binds.mute, () => win.send("mute"));
	}
	if (binds.play !== "") {
		electron.globalShortcut.register(binds.play, () => win.send("play"));
	}
	if (binds.next !== "") {
		electron.globalShortcut.register(binds.next, () => win.send("next"));
	}
	if (binds.like !== "") {
		electron.globalShortcut.register(binds.like, () => win.send("like"));
	}
	if (binds.dislike !== "") {
		electron.globalShortcut.register(binds.dislike, () => win.send("dislike"));
	}

	const page = win.webContents;
	const argv = require("minimist")(process.argv.slice(1));

	page.on("dom-ready", () => {
		page.insertCSS(fs.readFileSync(path.join(__dirname, "browser.css"), "utf8"));

		if (argv.minimize) {
			win.minimize();
		} else {
			win.show();
		}
	});

	const { session } = require("electron");

	session.defaultSession.webRequest.onBeforeRequest(["*://*./*"], function (details, callback) {
		const whitelist = /avatars.yandex.net|yapic.yandex.ru|avatars.mds.yandex.net|.ttf|.woff|registration-validations|passport-frontend|storage.yandex.net|music.yandex.ru|radio.yandex.ru|jquery.min.js|jquery-ui.min.js|.css/gi;

		if (whitelist.test(details.url)) {
			callback({ cancel: false });
		}
		else {
			//const { dialog } = require('electron')
			//dialog.showErrorBox('', details.url);
			var nodeConsole = require("console");
			var mainConsole = new nodeConsole.Console(process.stdout, process.stderr);
			mainConsole.log(`Blocked: ${details.url}`);
			callback({ cancel: true });
		}
	});

	// Open new link in electron for authorizations
	// page.on('new-window', (e, url) => {
	// 	e.preventDefault();
	// 	electron.shell.openExternal(url);
	// });
});

app.on("activate", () => win.show());

app.on("before-quit", () => {
	isQuitting = true;

	// electron.globalShortcut.unregister('MediaPlayPause');
	// electron.globalShortcut.unregister('MediaNextTrack');

	if (binds.mute !== "") {
		electron.globalShortcut.unregister(binds.mute);
	}
	if (binds.play !== "") {
		electron.globalShortcut.unregister(binds.play);
	}
	if (binds.next !== "") {
		electron.globalShortcut.unregister(binds.next);
	}
	if (binds.like !== "") {
		electron.globalShortcut.unregister(binds.like);
	}
	if (binds.dislike !== "") {
		electron.globalShortcut.unregister(binds.dislike);
	}

	if (!win.isFullScreen()) {
		config.set("lastWindowState", win.getBounds());
	}
});
