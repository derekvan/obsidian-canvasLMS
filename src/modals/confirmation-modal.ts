import { App, Modal } from 'obsidian';

export class ConfirmationModal extends Modal {
	private message: string;
	private confirmText: string;
	private onConfirm: () => void;
	private onCancel: () => void;

	constructor(
		app: App,
		title: string,
		message: string,
		confirmText: string,
		onConfirm: () => void,
		onCancel?: () => void
	) {
		super(app);
		this.titleEl.setText(title);
		this.message = message;
		this.confirmText = confirmText;
		this.onConfirm = onConfirm;
		this.onCancel = onCancel || (() => {});
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Warning message
		const messageEl = contentEl.createEl('p', {
			text: this.message,
			cls: 'mod-warning'
		});
		messageEl.style.marginBottom = '20px';

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const confirmButton = buttonContainer.createEl('button', {
			text: this.confirmText,
			cls: 'mod-cta'
		});
		confirmButton.addEventListener('click', () => {
			this.close();
			this.onConfirm();
		});

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.addEventListener('click', () => {
			this.close();
			this.onCancel();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
