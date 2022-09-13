import { Plugin } from 'obsidian';
import { formatDate } from './helpers';
import { DEFAULT_SETTINGS } from './settings';
import { MyPluginSettings } from './types';

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings = DEFAULT_SETTINGS;
    pluginName: string = 'CM6 Decoration Example by Murf';

    async onload() {
        console.log(`Loading plugin: ${this.pluginName} at [${formatDate()}]`);

        await this.loadSettings();

        // This adds a settings tab so the user can configure various aspects of the plugin
        // this.addSettingTab(new SampleSettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            // console.log('click', evt);
        });
    }

    onunload() {
        console.log(`Unloading plugin: ${this.pluginName} at [${formatDate()}]`);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
