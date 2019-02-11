"use strict";
const electron = require("electron");
const ipc = electron.ipcRenderer;
const webFrame = electron.webFrame;
const el = electron.remote.require("./index").element;
const customTitlebar = require("custom-electron-titlebar");
const menu = require("./menu");
let titlebar = null;

window.addEventListener("load", function () {
	const tbMenu = menu.create();
	titlebar = new customTitlebar.Titlebar({
		backgroundColor: customTitlebar.Color.fromHex("#444"),
		minimizable: true,
		closeable: true,
		maximizable: true,
		icon: "https://radio.yandex.ru/favicon32.png", //Fuck Content Security Policy
		menu: tbMenu
	});
	document.title = ""; //Removing page title
	titlebar.updateTitle(); //Synchronizing with titlebar
	//Handle player track changed event
	window.Mu.pages.adapter.on("show-track", () => ipc.send("trackChanged", getCurrentTrack()));
	//Handle player state changed event
	window.Mu.pages.adapter.on("state", () => ipc.send("stateChanged", window.Mu.pages.adapter.isPlaying()));
	//DESTROYING FUCKING ANTIADBLOCK MESSAGE
	window.Mu.blocks.blocks.notify.prototype.addMessage = (function () {
		var oldAddMessage = window.Mu.blocks.blocks.notify.prototype.addMessage;
		return function () {
			if (arguments && arguments.length > 0 && arguments[0].indexOf("реклам") !== -1) return;
			oldAddMessage.apply(this, arguments);
		};
	})();
}, false);

function getCurrentTrack() {
	const cur = window.Mu.pages.adapter.getCurrent();
	const author = (cur.artists.length > 0 ? (cur.artists.map(function (elem) { return elem.name; }).join(", ")) : "Unknown artist");
	const track = cur.title;
	const imageUrl = `https://${cur.ogImage.replace("%%", "100x100")}`;
	return [author, track, imageUrl];
}

function exec(command) {
	webFrame.executeJavaScript(command);
}

function click(s) {
	const els = document.querySelectorAll(s);
	if (els.length > 0) {
		els[els.length - 1].click();
	}
}

exports.preferences = () => {
	click(el.prefButton);
	window.setTimeout(() => {
		const w = document.documentElement.scrollWidth / 2 | 0;
		const h = document.documentElement.scrollHeight / 2 | 0;
		const pref = document.querySelector(el.prefDialog);
		const pw = pref.offsetWidth / 2 | 0;
		const ph = pref.offsetHeight / 2 | 0;
		pref.style.top = `${h - ph}px`;
		pref.style.left = `${w - pw}px`;
	}, 25);
};

exports.logout = () =>
	exec("window.open('https://passport.yandex.ru/passport?mode=embeddedauth&action=logout&retpath=https%3A%2F%2Fradio.yandex.ru&origin=radio_menu', '_blank')");

exports.play = () =>
	exec("Mu.pages.adapter.togglePause()");

exports.next = () =>
	exec("Mu.pages.adapter.next()");

exports.like = () =>
	click(el.like);

exports.dislike = () =>
	click(el.dislike);

exports.mute = () =>
	exec("Mu.pages.adapter.mute()");

exports.toggleHQ = () =>
	exec("Mu.pages.adapter.toggleHQ()");

exports.increaseVolume = () =>
	exec("Mu.pages.adapter.setVolume(Mu.pages.adapter.getVolume() + 0.05)");

exports.decreaseVolume = () =>
	exec("Mu.pages.adapter.setVolume(Mu.pages.adapter.getVolume() - 0.05)");

ipc.on("preferences", () => exports.preferences());
ipc.on("logout", () => exports.logout());
ipc.on("play", () => exports.play());
ipc.on("next", () => exports.next());
ipc.on("like", () => exports.like());
ipc.on("dislike", () => exports.dislike());
ipc.on("mute", () => exports.mute());
ipc.on("HQ", () => exports.toggleHQ());
ipc.on("increaseVolume", () => exports.increaseVolume());
ipc.on("decreaseVolume", () => exports.decreaseVolume());
