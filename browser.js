"use strict";
const electron = require("electron");
//const http = require('http');
const ipc = electron.ipcRenderer;
const webFrame = electron.webFrame;
const el = electron.remote.require('./index').element;

window.addEventListener("load", function () {
	//http.get("http://use.fontawesome.com/releases/v5.7.1/css/all.css", function (res) {
	//	res.setEncoding("utf8");
	//	res.on("data", function (chunk) {
	//		webFrame.insertCSS(chunk);
	//	});
	//});
	//document.body.insertAdjacentHTML("afterbegin", "<header id='titlebar'><div id='drag-region'><div id='window-controls'><div class='controlButton' id='min-button'><span>&#xE921;</span></div><div class='controlButton' id='max-button'><span>&#xE922;</span></div><div class='controlButton' id='restore-button'><span>&#xE923;</span></div><div class='controlButton' id='close-button'><span>&#xE8BB;</span></div></div></div></header>");
	window.Mu.pages.adapter.on("show-track", () => ipc.send("show-track", getCurrentTrack()));
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

ipc.on("preferences", () => {
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
});

ipc.on("logout", () => exec("window.open('https://passport.yandex.ru/passport?mode=embeddedauth&action=logout&retpath=https%3A%2F%2Fradio.yandex.ru&origin=radio_menu', '_blank')"));
ipc.on("play", () => exec("Mu.pages.adapter.togglePause()"));
ipc.on("next", () => exec("Mu.pages.adapter.next()"));
ipc.on("like", () => click(el.like));
ipc.on("dislike", () => click(el.dislike));
ipc.on("mute", () => exec("Mu.pages.adapter.mute()"));
ipc.on("HQ", () => exec("Mu.pages.adapter.toggleHQ()"));
