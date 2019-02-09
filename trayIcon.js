"use strict";
const path = require("path");
const electron = require("electron");
const settings = require("./settings");

const iconPath = path.join(__dirname, "static/Icon.png");

let appIcon = null;
let curTooltip = "";
let clickHandlerTimeout = 0;

function ctxTpl(win, app) {
	return [
		{
			label: "Play",
			click: function () { return win.send("play") }
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
			label: "Settings",
			click: () => settings.show()
		},
		{
			type: "separator"
		},
		{
			label: "Show App", click: function () {
				win.show();
			}
		},
		{
			label: "Quit", click: function () {
				//isQuitting = true;
				app.quit();
			}
		}
	];
}

function getClickHandler(onClick, onDblClick, delay) {
	delay = delay || 250;
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
	const ctxMenu = electron.Menu.buildFromTemplate(ctxTpl(win, app));
	appIcon = new electron.Tray(iconPath);

	appIcon.setContextMenu(ctxMenu);

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
	var clickHandler = getClickHandler(click, dblclick, 250);

	appIcon.addListener("click", clickHandler);
	appIcon.addListener("double-click", clickHandler);

	win.on("show", function () {
		appIcon.setHighlightMode("always");
	});
};

exports.setTrayTooltip = (tooltip) => {
	appIcon.setToolTip(tooltip);
	curTooltip = tooltip;
};
