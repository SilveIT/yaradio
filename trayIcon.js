"use strict";
const path = require("path");
const electron = require("electron");
const settings = require("./settings");
const iconPath = path.join(__dirname, "static/Icon.png");

let ctxMenu = null;
let appIcon = null;
let curTooltip = "";
let clickHandlerTimeout = 0;

function ctxTpl(win, app, showNotify) {
	return [
		{
			label: "Play / pause",
			click: () => win.send("play")
		},
		{
			label: "Next Track",
			click: () => win.send("next")
		},
		{
			type: "separator"
		},
		{
			label: "Mute",
			click: () => win.send("mute")
		},
		{
			type: "separator"
		},
		{
			label: "Like",
			click: () => win.send("like")
		},
		{
			label: "Dislike",
			click: () => win.send("dislike")
		},
		{
			type: "separator"
		},
		{
			label: "Show notifications",
			type: "checkbox",
			checked: showNotify,
			click: () => changeShowNotify()
		},
		{
			type: "separator"
		},
		{
			label: "Settings",
			click: () => settings.show()
		},
		{
			type: "separator"
		},
		{
			label: "Show App",
			click: () => win.show()
		},
		{
			label: "Quit",
			click: () => app.quit()
		}
	];
}

function changeShowNotify() {
	const enableNotifications = settings.value("notifications.enable").indexOf("true") !== -1;
	settings.value("notifications.enable", !enableNotifications ? ["true"] : []);
}

function updateIconMenu(win, app) {
	const enableNotifications = settings.value("notifications.enable").indexOf("true") !== -1;
	ctxMenu = electron.Menu.buildFromTemplate(ctxTpl(win, app, enableNotifications));
	appIcon.setContextMenu(ctxMenu);
}

function getClickHandler(onClick, onDblClick, delay) {
	delay = delay || 500;
	return function (event) {
		if (clickHandlerTimeout <= 0) {
			clickHandlerTimeout = setTimeout(function () {
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

exports.create = (win, app, eNotify) => {
	appIcon = new electron.Tray(iconPath);
	updateIconMenu(win, app);

	const click = (e) => {
		e.preventDefault();
		if (curTooltip === "") return;
		electron.clipboard.writeText(curTooltip);
		eNotify.notify(
			{
				title: "Copied to clipboard",
				text: curTooltip,
				displayTime: 1500
			});
	};
	const dblclick = (e) => {
		e.preventDefault();
		if (win.isVisible()) {
			win.hide();
		} else {
			win.show();
		}
	};

	var clickHandler = getClickHandler(click, dblclick, 500);

	appIcon.addListener("click", clickHandler);
	appIcon.addListener("double-click", clickHandler);

	settings.on("save", () => {
		//I'll update menu anyway, don't want to check every setting separately
		updateIconMenu(win, app);
	});

	win.on("show", function () {
		appIcon.setHighlightMode("always");
	});
};

exports.setTrayTooltip = (tooltip) => {
	appIcon.setToolTip(tooltip);
	curTooltip = tooltip;
};
