'use strict';
const {
	ipcRenderer,
	webFrame
} = require('electron');
const ipc = ipcRenderer;
const {
	Titlebar,
	Color
} = require('custom-electron-titlebar');
const {
	create
} = require('./deps/menu.cjs');
let titlebar = null;
const el = {
	activeStation: '.page-index .station_playing',
	dislike: '.page-station .button.like_action_dislike',
	like: '.page-station .button.like_action_like',
	mute: '.page-root .volume__icon',
	next: '.page-station .slider__item_next',
	play: '.page-station .player-controls__play',
	prefButton: '.page-root .settings',
	prefDialog: '.page-root .settings-stream.popup'
};

window.addEventListener('load', () => {
	const tbMenu = create();
	titlebar = new Titlebar({
		backgroundColor: Color.fromHex('#444'),
		minimizable: true,
		closeable: true,
		maximizable: true,
		icon: 'https://radio.yandex.ru/favicon32.png', // Fuck Content Security Policy
		menu: tbMenu
	});
	document.title = ''; // Removing page title
	titlebar.updateTitle(); // Synchronizing with titlebar
	// Handle player track changed event
	window.Mu.pages.adapter.on('show-track', () => ipc.send('trackChanged', getCurrentTrack()));
	// Handle player state changed event
	window.Mu.pages.adapter.on('state', () => ipc.send('stateChanged', window.Mu.pages.adapter.isPlaying()));
	// AntiAntiAdblockMessage
	window.Mu.blocks.blocks.notify.prototype.addMessage = (function () {
		const oldAddMessage = window.Mu.blocks.blocks.notify.prototype.addMessage;
		return function (...args) {
			if (args && arguments.length > 0 && args[0].indexOf('реклам') !== -1) return;
			oldAddMessage.apply(this, args);
		};
	})();
}, false);

function getCurrentTrack() {
	const cur = window.Mu.pages.adapter.getCurrent();
	const author = (cur.artists.length > 0 ? (cur.artists.map(
		elem => {
			return elem.name;
		}
	).join(', ')) : 'Unknown artist');
	const track = cur.title;
	const imageUrl = `https://${cur.ogImage.replace('%%', '100x100')}`;
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

exports.logout = () => {
	return exec('window.open(\'https://passport.yandex.ru/passport?mode=embeddedauth&action=logout&retpath=https%3A%2F%2Fradio.yandex.ru&origin=radio_menu\', \'_blank\')');
};

exports.play = () => {
	return exec('Mu.pages.adapter.togglePause()');
};

exports.next = () => {
	return exec('Mu.pages.adapter.next()');
};

exports.like = () => {
	return click(el.like);
};

exports.dislike = () => {
	return click(el.dislike);
};

exports.mute = () => {
	return exec('Mu.pages.adapter.mute()');
};

exports.toggleHQ = () => {
	return exec('Mu.pages.adapter.toggleHQ()');
};

exports.increaseVolume = () => {
	return exec('Mu.pages.adapter.setVolume(Mu.pages.adapter.getVolume() + 0.05)');
};

exports.decreaseVolume = () => {
	return exec('Mu.pages.adapter.setVolume(Mu.pages.adapter.getVolume() - 0.05)');
};

ipc.on('preferences', () => exports.preferences());
ipc.on('logout', () => exports.logout());
ipc.on('play', () => exports.play());
ipc.on('next', () => exports.next());
ipc.on('like', () => exports.like());
ipc.on('dislike', () => exports.dislike());
ipc.on('mute', () => exports.mute());
ipc.on('HQ', () => exports.toggleHQ());
ipc.on('increaseVolume', () => exports.increaseVolume());
ipc.on('decreaseVolume', () => exports.decreaseVolume());
