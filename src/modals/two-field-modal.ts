/**
 * Two-field input modal for Link and File templates
 */

import { App, Modal, Setting } from 'obsidian';

export interface TwoFieldData {
	field1: string;
	field2: string;
}

export class TwoFieldModal extends Modal {
	private data: TwoFieldData = { field1: '', field2: '' };
	private onSubmit: (data: TwoFieldData) => void;
	private title: string;
	private label1: string;
	private placeholder1: string;
	private label2: string;
	private placeholder2: string;

	constructor(
		app: App,
		title: string,
		label1: string,
		placeholder1: string,
		label2: string,
		placeholder2: string,
		onSubmit: (data: TwoFieldData) => void
	) {
		super(app);
		this.title = title;
		this.label1 = label1;
		this.placeholder1 = placeholder1;
		this.label2 = label2;
		this.placeholder2 = placeholder2;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Set modal title
		this.titleEl.setText(this.title);

		// Create first input
		new Setting(contentEl)
			.setName(this.label1)
			.addText(text => {
				text
					.setPlaceholder(this.placeholder1)
					.onChange(value => {
						this.data.field1 = value.trim();
					});

				// Auto-focus the first input
				setTimeout(() => text.inputEl.focus(), 10);

				// Handle Enter key to move to next field
				text.inputEl.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						// Focus next input
						const nextInput = contentEl.querySelectorAll('input')[1] as HTMLInputElement;
						if (nextInput) {
							nextInput.focus();
						}
					}
				});
			});

		// Create second input
		new Setting(contentEl)
			.setName(this.label2)
			.addText(text => {
				text
					.setPlaceholder(this.placeholder2)
					.onChange(value => {
						this.data.field2 = value.trim();
					});

				// Handle Enter key to submit
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
		// Validate both fields
		if (!this.data.field1 || !this.data.field2) {
			const existingError = this.contentEl.querySelector('.template-input-error');
			if (existingError) {
				existingError.remove();
			}
			const errorEl = this.contentEl.createEl('p', {
				text: 'Please fill in all fields',
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
