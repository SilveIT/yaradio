'use strict';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
//import electron from 'electron';
const {Menu, Tray, clipboard} = globalThis.electron;
import prefs from './preferences.cjs';
const iconPath = join(__dirname, '../static/Icon_pause.png');

let ctxMenu = null;
let appIcon = null;
let curTooltip = '';
let clickHandlerTimeout = 0;

function ctxTpl(win, app, showNotify) {
	return [{
		label: 'Play / pause',
		click: () => win.send('play')
	},
	{
		label: 'Next Track',
		click: () => win.send('next')
	},
	{
		type: 'separator'
	},
	{
		label: 'Mute',
		click: () => win.send('mute')
	},
	{
		type: 'separator'
	},
	{
		label: 'Like',
		click: () => win.send('like')
	},
	{
		label: 'Dislike',
		click: () => win.send('dislike')
	},
	{
		type: 'separator'
	},
	{
		label: 'Show notifications',
		type: 'checkbox',
		checked: showNotify,
		click: () => changeShowNotify()
	},
	{
		type: 'separator'
	},
	{
		label: 'Preferences',
		click: () => prefs.show()
	},
	{
		type: 'separator'
	},
	{
		label: 'Show App',
		click: () => win.show()
	},
	{
		label: 'Quit',
		click: () => app.quit()
	}];
}

function changeShowNotify() {
	const enableNotifications = prefs.value('notifications.enable').indexOf('true') !== -1;
	prefs.value('notifications.enable', enableNotifications ? [] : ['true']);
}

function updateIconMenu(win, app) {
	const enableNotifications = prefs.value('notifications.enable').indexOf('true') !== -1;
	ctxMenu = Menu.buildFromTemplate(ctxTpl(win, app, enableNotifications));
	appIcon.setContextMenu(ctxMenu);
}

function getClickHandler(onClick, onDblClick, delay) {
	delay = delay || 500;
	return function (event) {
		if (clickHandlerTimeout <= 0) {
			clickHandlerTimeout = setTimeout(() => {
				if (clickHandlerTimeout <= 0) return;
				onClick(event);
				clickHandlerTimeout = 0;
			}, delay);
		} else {
			clearTimeout(clickHandlerTimeout);
			clickHandlerTimeout = 0;
			onDblClick(event);
		}
	};
}

export function create(win, app, eNotify, themeText) {
	appIcon = new Tray(iconPath);
	updateIconMenu(win, app);

	const click = e => {
		e.preventDefault();
		if (curTooltip === '') return;
		clipboard.writeText(curTooltip);
		eNotify.notify({
			title: 'Copied to clipboard</b><img style="display:none;" src=x onerror=\'' + themeText + ((prefs.value('window.theme').indexOf('true') === -1) ? '; setNotifyTheme(false);' : '; setNotifyTheme(true);') + '\'><b>',
			image: join(__dirname, '../static/Icon.png'),
			text: curTooltip,
			displayTime: 1500
		});
	};
	const dblclick = e => {
		e.preventDefault();
		if (win.isVisible()) {
			win.hide();
		} else {
			win.show();
		}
	};

	const clickHandler = getClickHandler(click, dblclick, 500);

	appIcon.addListener('click', clickHandler);
	appIcon.addListener('double-click', clickHandler);

	prefs.on('save', () => {
		//I'll update menu anyway, don't want to check every setting separately
		updateIconMenu(win, app);
	});
}

export function setTrayTooltip(tooltip) {
	appIcon.setToolTip(tooltip);
	curTooltip = tooltip;
}

export function setTrayIcon(path) {
	appIcon.setImage(path);
}
