import { App, PluginSettingTab, Setting } from 'obsidian';
import type CanvaslmsHelperPlugin from './main';

export interface PluginSettings {
	canvasUrl: string;
	canvasToken: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	canvasUrl: '',
	canvasToken: ''
};

export class SettingsTab extends PluginSettingTab {
	plugin: CanvaslmsHelperPlugin;

	constructor(app: App, plugin: CanvaslmsHelperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Canvas LMS settings' });
		containerEl.createEl('p', {
			text: 'To use this plugin, you need a Canvas API token. Generate one from your Canvas account settings > Approved Integrations > New Access Token.'
		});

		new Setting(containerEl)
			.setName('Canvas URL')
			.setDesc('The base URL of your Canvas instance (e.g., https://your-institution.instructure.com)')
			.addText(text => text
				.setPlaceholder('https://your-institution.instructure.com')
				.setValue(this.plugin.settings.canvasUrl)
				.onChange(async (value) => {
					this.plugin.settings.canvasUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Canvas API token')
			.setDesc('Your Canvas API access token')
			.addText(text => {
				text
					.setPlaceholder('Enter your Canvas API token')
					.setValue(this.plugin.settings.canvasToken)
					.onChange(async (value) => {
						this.plugin.settings.canvasToken = value.trim();
						await this.plugin.saveSettings();
					});
				// Make it a password field
				text.inputEl.type = 'password';
			});
	}
}
