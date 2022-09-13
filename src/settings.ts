import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from './main';
import { MyPluginSettings } from './types';

export const DEFAULT_SETTINGS: MyPluginSettings = {
    MyConfigSettings: {
        mySetting1: 'default1',
        mySetting2: 'default2',
    },
}

export class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });

        let newSetting = new Setting(containerEl);
        newSetting.setName("My Setting");
        newSetting.setDesc("This is a description of my setting");
        newSetting.addText(textInput => {
            textInput.setPlaceholder("Enter your setting here");
            textInput.setValue(this.plugin.settings.MyConfigSettings.mySetting1);
            textInput.onChange(async (value) => {
                console.log('Setting1: ' + value);
                this.plugin.settings.MyConfigSettings.mySetting1 = value;
                await this.plugin.saveSettings();
            });
        });

        newSetting = new Setting(containerEl);
        newSetting.setName("My Setting 2");
        newSetting.setDesc("This is a description of my setting 2");
        newSetting.addText(textInput => {
            textInput.setPlaceholder("Enter your setting here 2");
            textInput.setValue(this.plugin.settings.MyConfigSettings.mySetting2);
            textInput.onChange(async (value) => {
                console.log('Setting2: ' + value);
                this.plugin.settings.MyConfigSettings.mySetting2 = value;
                await this.plugin.saveSettings();
            });
        });
    }
}
