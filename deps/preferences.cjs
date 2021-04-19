'use strict';
const {app} = globalThis.electron;
const {resolve} = require('path');
const ElectronPreferences = require('electron-preferences');

const prefs = new ElectronPreferences({
	/**
	 * Where should preferences be saved?
	 */
	dataStore: resolve(app.getPath('userData'), 'preferences.json'),
	/**
	 * Default values.
	 */
	defaults: {
		lastWindowState: {
			x: 0,
			y: 0,
			width: 800,
			height: 700
		},
		notifications: {
			enable: ['true'],
			showPreviews: ['true'],
			displayTime: 4000
		},
		keyboard: {
			dislike: 'Control+Shift+PageDown',
			like: 'Control+Shift+PageUp',
			mute: '',
			next: 'Control+Shift+Right',
			play: 'Control+Shift+Left',
			increaseVolume: 'Control+Shift+Up',
			decreaseVolume: 'Control+Shift+Down'
		},
		window: {
			controlsBehavior: [
				'trayOnMinimize'
			],
			customThemePath: '',
			theme: [],
			useCustom: []
		}
	},
	/**
	 * If the `onLoad` method is specified, this function will be called immediately after
	 * preferences are loaded for the first time. The return value of this method will be stored as the
	 * preferences object.
	 */
	onLoad: preferences => {
		// ...
		return preferences;
	},
	webPreferences: {
		devTools: true
	},
	/**
	 * The preferences window is divided into sections. Each section has a label, an icon, and one or
	 * more fields associated with it. Each section should also be given a unique ID.
	 */
	sections: [
		{
			id: 'window',
			label: 'Window',
			icon: 'widget',
			form: {
				groups: [{
					label: 'Behavior',
					fields: [{
						label: 'Choose window controls behavior:',
						key: 'controlsBehavior',
						type: 'checkbox',
						options: [{
							label: 'Minimize to tray on window close',
							value: 'trayOnClose'
						},
						{
							label: 'Minimize to tray on window minimize',
							value: 'trayOnMinimize'
						}]
					},
					{
						content: ' ',
						type: 'message'
					}]
				},
				{
					label: 'Appearance',
					fields: [{
						key: 'theme',
						type: 'checkbox',
						options: [{
							label: 'Enable dark theme',
							value: 'true'
						}]
					},
					{
						label: 'You can also choose your own theme',
						key: 'useCustom',
						type: 'checkbox',
						options: [{
							label: 'Enable custom theme',
							value: 'true'
						}]
					},
					{
						key: 'customThemePath',
						type: 'directory',
						help: 'The location where your css files are stored.'
					}]
				}]
			}
		},
		{
			id: 'notifications',
			label: 'Notifications',
			icon: 'bell-53',
			form: {
				groups: [{
					label: 'Notifications',
					fields: [{
						key: 'enable',
						type: 'checkbox',
						options: [{
							label: 'Enable notifications',
							value: 'true'
						}]
					},
					{
						key: 'showPreviews',
						type: 'checkbox',
						options: [{
							label: 'Show preview',
							value: 'true'
						}]
					},
					{
						label: 'Display time',
						key: 'displayTime',
						type: 'slider',
						min: 500,
						max: 15000
					}]
				}]
			}
		},
		{
			id: 'keyboard',
			label: 'Keyboard shortcuts',
			icon: 'flash-21',
			form: {
				groups: [{
					label: 'Keyboard shortcuts',
					fields: [{
						label: 'Play',
						key: 'play',
						type: 'text'
					},
					{
						label: 'Next',
						key: 'next',
						type: 'text'
					},
					{
						label: 'Like',
						key: 'like',
						type: 'text'
					},
					{
						label: 'Dislike',
						key: 'dislike',
						type: 'text'
					},
					{
						label: 'Mute',
						key: 'mute',
						type: 'text'
					},
					{
						label: 'Increase volume',
						key: 'increaseVolume',
						type: 'text'
					},
					{
						label: 'Decrease volume',
						key: 'decreaseVolume',
						type: 'text'
					}]
				}]
			}
		}
	]
});

function isObject(val) {
	return !Array.isArray(val) && (typeof val === 'object' || typeof val === 'function');
}

function mergeProperties(objSource, objTarget) {
	const keys = Object.keys(objSource);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (Object.prototype.hasOwnProperty.call(objSource, key)) {
			if (Object.prototype.hasOwnProperty.call(objTarget, key)) {
				const subObj1 = objSource[key];
				const subObj2 = objTarget[key];
				const isObj1 = isObject(subObj1);
				const isObj2 = isObject(subObj2);

				if (isObj1 && isObj2)
					mergeProperties(subObj1, subObj2);
				else if (isObj1) {
					console.log(`[Config] Found mismatch with property type on ${key}, overwriting`);
					objTarget[key] = objSource[key];
				}
			} else {
				console.log(`[Config] Copying ${key} from defaults`);
				Object.defineProperty(objTarget, key, Object.getOwnPropertyDescriptor(objSource, key));
				objTarget[key] = objSource[key];
			}
		}
	}
	return objTarget;
}

prefs.verifyConfig = function () {
	this.preferences = mergeProperties(this.defaults, this._preferences); //Can be replaced with lodash's defaultsDeep
	this.save();
};

//export default prefs;
module.exports = prefs;
