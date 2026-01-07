/**
 * Simple text input modal for single-field templates
 */

import { App, Modal, Setting } from 'obsidian';

export class SimpleTextModal extends Modal {
	private value: string = '';
	private onSubmit: (value: string) => void;
	private title: string;
	private label: string;
	private placeholder: string;

	constructor(
		app: App,
		title: string,
		label: string,
		placeholder: string,
		onSubmit: (value: string) => void
	) {
		super(app);
		this.title = title;
		this.label = label;
		this.placeholder = placeholder;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Set modal title
		this.titleEl.setText(this.title);

		// Create input setting
		new Setting(contentEl)
			.setName(this.label)
			.addText(text => {
				text
					.setPlaceholder(this.placeholder)
					.onChange(value => {
						this.value = value.trim();
					});

				// Auto-focus the input
				setTimeout(() => text.inputEl.focus(), 10);

				// Handle Enter key
				text.inputEl.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						this.submit();
					}
				});
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
		if (!this.value) {
			// Show error
			const existingError = this.contentEl.querySelector('.template-input-error');
			if (existingError) {
				existingError.remove();
			}
			const errorEl = this.contentEl.createEl('p', {
				text: `Please enter a ${this.label.toLowerCase()}`,
				cls: 'template-input-error'
			});
			errorEl.style.color = 'var(--text-error)';
			return;
		}

		this.close();
		this.onSubmit(this.value);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
