"use strict";
const electron = require("electron");
const shell = electron.shell;
const app = electron.remote.app;
const appName = app.getName();
const ipc = electron.ipcRenderer;
const browser = require("./browser");

const helpSubmenu = [
	{
		label: `${appName} Website`,
		click() {
			shell.openExternal("https://git.teiko.studio/SilverIce/yaradio");
		}
	},
	{
		label: "Report an Issue...",
		click: () => ipc.send("issueReport")
	}
];

if (process.platform !== "darwin") {
	helpSubmenu.push(
		{
			type: "separator"
		},
		{
			role: "about",
			click() {
				ipc.send("showAbout");
			}
		}
	);
}

function darwinTpl() {
	return [
		{
			label: appName,
			submenu: [
				{
					role: "about"
				},
				{
					type: "separator"
				},
				{
					label: "HQ",
					click: () => browser.toggleHQ()
				},
				{
					label: "Mute",
					// accelerator: "M",
					click: () => browser.mute()
				},
				{
					type: "separator"
				},
				{
					label: "Settings",
					click: () => ipc.send("showSettings")
				},
				{
					label: "Logout",
					click: () => browser.logout()
				},
				{
					type: "separator"
				},
				{
					role: "services",
					submenu: []
				},
				{
					type: "separator"
				},
				{
					role: "hide"
				},
				{
					role: "hideothers"
				},
				{
					role: "unhide"
				}
			]
		},
		{
			label: "Station",
			submenu: [
				{
					label: "Play / pause",
					// accelerator: 'Space',
					click: () => browser.play()
				},
				{
					label: "Next Track",
					// accelerator: 'L',
					click: () => browser.next()
				},
				{
					type: "separator"
				},
				{
					label: "Like",
					// accelerator: 'F',
					click: () => browser.like()
				},
				{
					label: "Dislike",
					// accelerator: 'D',
					click: () => browser.dislike()
				},
				{
					type: "separator"
				},
				{
					label: "Preferences...",
					// accelerator: "Cmd+,",
					click: () => browser.preferences()
				}
			]
		},
		{
			role: "help",
			submenu: helpSubmenu
		}
	];
}

function otherTpl() {
	return [
		{
			label: appName,
			submenu: [
				{
					label: "Settings",
					click: () => ipc.send("showSettings")
				},
				{
					label: "Logout",
					click: () => browser.logout()
				},
				{
					type: "separator"
				},
				{
					role: "quit"
				}
			]
		},
		{
			label: "Station",
			submenu: [
				{
					label: "Play / pause",
					// accelerator: "Space",
					click: () => browser.play()
				},
				{
					label: "Next Track",
					// accelerator: 'L',
					click: () => browser.next()
				},
				{
					type: "separator"
				},
				{
					label: "Mute",
					// accelerator: "M",
					click: () => browser.mute()
				},
				{
					type: "separator"
				},
				{
					label: "Like",
					// accelerator: 'F',
					click: () => browser.like()
				},
				{
					label: "Dislike",
					// accelerator: 'D',
					click: () => browser.dislike()
				},
				{
					type: "separator"
				},
				{
					label: "HQ",
					click: () => browser.toggleHQ()
				},
				{
					type: "separator"
				},
				{
					label: "Preferences...",
					// accelerator: "Cmd+,",
					click: () => browser.preferences()
				}
			]
		},
		{
			role: "help",
			submenu: helpSubmenu
		}
	];
}

exports.create = () => {
	const tpl = process.platform === "darwin" ? darwinTpl() : otherTpl();
	const menu = electron.remote.Menu.buildFromTemplate(tpl);
	return menu;
};
