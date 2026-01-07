/**
 * Content type picker modal for meta-command
 */

import { App, Modal, Setting } from 'obsidian';
import type { ContentType } from '../templates/template-types';

interface ContentTypeOption {
	value: ContentType;
	label: string;
	description: string;
}

export class ContentTypeModal extends Modal {
	private selectedType: ContentType = 'module';
	private onSubmit: (type: ContentType) => void;

	private contentTypes: ContentTypeOption[] = [
		{
			value: 'module',
			label: 'Module',
			description: 'Top-level course section (H1)'
		},
		{
			value: 'header',
			label: 'Header',
			description: 'Text header within a module'
		},
		{
			value: 'page',
			label: 'Page',
			description: 'Wiki-style content page'
		},
		{
			value: 'link',
			label: 'External Link',
			description: 'Link to external URL'
		},
		{
			value: 'file',
			label: 'File',
			description: 'Reference to Canvas file'
		},
		{
			value: 'assignment',
			label: 'Assignment',
			description: 'Graded assignment with metadata'
		},
		{
			value: 'discussion',
			label: 'Discussion',
			description: 'Discussion board with optional grading'
		},
		{
			value: 'internal-link',
			label: 'Internal Link',
			description: 'Cross-reference to another Canvas item'
		}
	];

	constructor(app: App, onSubmit: (type: ContentType) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Set modal title
		this.titleEl.setText('Add Canvas Content');

		contentEl.createEl('p', {
			text: 'Select the type of content to insert'
		});

		// Create dropdown with all content types
		new Setting(contentEl)
			.setName('Content type')
			.addDropdown(dropdown => {
				// Add all options
				this.contentTypes.forEach(type => {
					dropdown.addOption(type.value, type.label);
				});

				dropdown
					.setValue('module')
					.onChange(value => {
						this.selectedType = value as ContentType;
						this.updateDescription(value as ContentType);
					});
			});

		// Description area
		const descEl = contentEl.createEl('p', {
			text: this.contentTypes[0].description,
			cls: 'mod-muted content-type-description'
		});

		// Update description function
		this.updateDescription = (type: ContentType) => {
			const option = this.contentTypes.find(t => t.value === type);
			if (option) {
				descEl.setText(option.description);
			}
		};

		// Add buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const submitButton = buttonContainer.createEl('button', {
			text: 'Next',
			cls: 'mod-cta'
		});
		submitButton.addEventListener('click', () => this.submit());

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.addEventListener('click', () => this.close());

		// Auto-focus dropdown
		setTimeout(() => {
			const dropdown = contentEl.querySelector('select') as HTMLSelectElement;
			if (dropdown) dropdown.focus();
		}, 10);
	}

	private updateDescription: (type: ContentType) => void;

	private submit(): void {
		this.close();
		this.onSubmit(this.selectedType);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
