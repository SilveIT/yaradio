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
			id: 'about',
			label: 'About You',
			/**
             * See the list of available icons below.
             */
			icon: 'single-01',
			form: {
				groups: [
					{
						/**
                         * Group heading is optional.
                         */
						label: 'About You'
					}
				]
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
