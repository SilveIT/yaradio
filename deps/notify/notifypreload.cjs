'use strict';

const electron = require('electron');
const ipc = electron.ipcRenderer;
const winId = electron.remote.getCurrentWindow().id;

function setStyle(config) {
	// Style it
	const notiDoc = global.window.document;
	const container = notiDoc.getElementById('container');
	const appIcon = notiDoc.getElementById('appIcon');
	const image = notiDoc.getElementById('image');
	const close = notiDoc.getElementById('close');
	const message = notiDoc.getElementById('message');
	// Default style
	setStyleOnDomElement(config.defaultStyleContainer, container);
	// Size and radius
	const style = {
		height: config.height - (2 * config.borderRadius) - (2 * config.defaultStyleContainer.padding),
		width: config.width - (2 * config.borderRadius) - (2 * config.defaultStyleContainer.padding),
		borderRadius: config.borderRadius + 'px'
	};
	setStyleOnDomElement(style, container);
	// Style appIcon or hide
	if (config.appIcon) {
		setStyleOnDomElement(config.defaultStyleAppIcon, appIcon);
		appIcon.src = config.appIcon;
	} else {
		setStyleOnDomElement({
			display: 'none'
		}, appIcon);
	}
	// Style image
	setStyleOnDomElement(config.defaultStyleImage, image);
	// Style close button
	setStyleOnDomElement(config.defaultStyleClose, close);
	// Remove margin from text p
	setStyleOnDomElement(config.defaultStyleText, message);
}

function setContents(event, notificationObjJson) {
	const notificationObj = JSON.parse(notificationObjJson);
	// sound
	if (notificationObj.sound) {
		// Check if file is accessible
		try {
			// If it's a local file, check it's existence
			// Won't check remote files e.g. http://
			if (notificationObj.sound.match(/^file:/) !== null ||
      notificationObj.sound.match(/^\//) !== null) {
				const audio = new global.window.Audio(notificationObj.sound);
				audio.play();
			}
		} catch (e) {
			log('electron-notify: ERROR could not find sound file: ' + notificationObj.sound.replace('file://', ''), e, e.stack);
		}
	}

	const notiDoc = global.window.document;
	// Title
	const titleDoc = notiDoc.getElementById('title');
	titleDoc.innerHTML = notificationObj.title || '';
	// message
	const messageDoc = notiDoc.getElementById('message');
	messageDoc.innerHTML = notificationObj.text || '';
	// Image
	const imageDoc = notiDoc.getElementById('image');
	if (notificationObj.image) {
		imageDoc.src = notificationObj.image;
	} else {
		setStyleOnDomElement({display: 'none'}, imageDoc);
	}

	// Close button
	const closeButton = notiDoc.getElementById('close');
	closeButton.addEventListener('click', event => {
		event.stopPropagation();
		ipc.send('electron-notify-close', winId, notificationObj);
	});

	// URL
	const container = notiDoc.getElementById('container');
	container.addEventListener('click', () => {
		ipc.send('electron-notify-click', winId, notificationObj);
	});
}

function setStyleOnDomElement(styleObj, domElement) {
	try {
		// eslint-disable-next-line guard-for-in
		for (const styleAttr in styleObj) {
			domElement.style[styleAttr] = styleObj[styleAttr];
		}
	} catch {
		throw new Error('electron-notify: Could not set style on domElement', styleObj, domElement);
	}
}

function loadConfig(event, conf) {
	setStyle(conf || {});
}

function reset() {
	const notiDoc = global.window.document;
	const container = notiDoc.getElementById('container');
	const closeButton = notiDoc.getElementById('close');

	// Remove event listener
	const newContainer = container.cloneNode(true);
	container.parentNode.replaceChild(newContainer, container);
	const newCloseButton = closeButton.cloneNode(true);
	closeButton.parentNode.replaceChild(newCloseButton, closeButton);
}

ipc.on('electron-notify-set-contents', setContents);
ipc.on('electron-notify-load-config', loadConfig);
ipc.on('electron-notify-reset', reset);

function log(...args) {
	console.log(...args);
}

delete global.require;
delete global.exports;
delete global.module;
