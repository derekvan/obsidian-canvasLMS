/**
 * Internal link modal for Canvas cross-references
 */

import { App, Modal, Setting } from 'obsidian';
import type { InternalLinkData } from '../templates/template-types';

export class InternalLinkModal extends Modal {
	private data: InternalLinkData = {
		type: 'Page',
		name: ''
	};
	private onSubmit: (data: InternalLinkData) => void;

	constructor(app: App, onSubmit: (data: InternalLinkData) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Set modal title
		this.titleEl.setText('Insert Canvas Internal Link');

		contentEl.createEl('p', {
			text: 'Create a cross-reference to another Canvas item',
			cls: 'mod-muted'
		});

		// Type selector
		new Setting(contentEl)
			.setName('Link type')
			.setDesc('Type of content to link to')
			.addDropdown(dropdown => {
				dropdown
					.addOption('Page', 'Page')
					.addOption('Assignment', 'Assignment')
					.addOption('Discussion', 'Discussion')
					.addOption('File', 'File')
					.setValue('Page')
					.onChange(value => {
						this.data.type = value as 'Page' | 'Assignment' | 'Discussion' | 'File';
					});
			});

		// Name input
		new Setting(contentEl)
			.setName('Item name')
			.setDesc('Name of the item to link to')
			.addText(text => {
				text
					.setPlaceholder('Enter item name')
					.onChange(value => {
						this.data.name = value.trim();
					});

				// Auto-focus
				setTimeout(() => text.inputEl.focus(), 10);

				// Handle Enter key
				text.inputEl.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						this.submit();
					}
				});
			});

		// Add example
		contentEl.createEl('p', {
			text: 'Example: [[Page:Course Policies]] or [[Assignment:Homework 1]]',
			cls: 'mod-muted'
		});

		// Add buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const submitButton = buttonContainer.createEl('button', {
			text: 'Insert',
			cls: 'mod-cta'
		});
		submitButton.addEventListener('click', () => this.submit());

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.addEventListener('click', () => this.close());
	}

	private submit(): void {
		// Validate
		if (!this.data.name) {
			const existingError = this.contentEl.querySelector('.template-input-error');
			if (existingError) {
				existingError.remove();
			}
			const errorEl = this.contentEl.createEl('p', {
				text: 'Please enter an item name',
				cls: 'template-input-error'
			});
			errorEl.style.color = 'var(--text-error)';
			return;
		}

		this.close();
		this.onSubmit(this.data);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
