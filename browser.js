"use strict";
const electron = require("electron");

const ipc = electron.ipcRenderer;
const webFrame = electron.webFrame;
const config = require("./config");

const el = config.get("element");

function exec(command) {
	webFrame.executeJavaScript(`if (!window.a) a = new Mu.Adapter(); ${command};`);
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
		let w = document.documentElement.scrollWidth / 2 | 0;
		let h = document.documentElement.scrollHeight / 2 | 0;
		let pref = document.querySelector(el.prefDialog);
		let pw = pref.offsetWidth / 2 | 0;
		let ph = pref.offsetHeight / 2 | 0;
		pref.style.top = `${h - ph}px`;
		pref.style.left = `${w - pw}px`;
	}, 25);
});

ipc.on("log-out", () => {
});

ipc.on("play", () => exec("a.togglePause()"));
ipc.on("next", () => exec("a.next()"));
ipc.on("like", () => click(el.like));
ipc.on("dislike", () => click(el.dislike));
ipc.on("mute", () => exec("a.mute()"));
ipc.on("HQ", () => exec("a.toggleHQ()"));
