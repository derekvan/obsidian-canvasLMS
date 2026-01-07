/**
 * Folder picker modal with suggester for saving downloaded courses
 */

import { App, Modal, Setting, TFolder, TAbstractFile } from 'obsidian';

export class FolderPickerModal extends Modal {
	private folderPath: string = '';
	private onSubmit: (folderPath: string | null) => void;
	private submitted: boolean = false;

	constructor(
		app: App,
		defaultFolder: string,
		onSubmit: (folderPath: string | null) => void
	) {
		super(app);
		this.folderPath = defaultFolder;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Set modal title
		this.titleEl.setText('Save Course');

		// Get all folders in vault
		const folders = this.getAllFolders();

		// Create folder selector
		new Setting(contentEl)
			.setName('Folder')
			.setDesc('Select where to save the course file')
			.addDropdown(dropdown => {
				// Add root folder option
				dropdown.addOption('', '/ (root)');

				// Add all other folders
				folders.forEach(folder => {
					dropdown.addOption(folder, folder);
				});

				// Set the default value
				dropdown.setValue(this.folderPath);

				dropdown.onChange(value => {
					this.folderPath = value;
				});
			});

		// Add buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const submitButton = buttonContainer.createEl('button', {
			text: 'Save',
			cls: 'mod-cta'
		});
		submitButton.addEventListener('click', () => this.submit());

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.addEventListener('click', () => this.close());
	}

	private getAllFolders(): string[] {
		const folders: string[] = [];
		const files = this.app.vault.getAllLoadedFiles();

		files.forEach((file: TAbstractFile) => {
			if (file instanceof TFolder) {
				folders.push(file.path);
			}
		});

		// Sort folders alphabetically
		folders.sort((a, b) => a.localeCompare(b));

		return folders;
	}

	private submit(): void {
		this.submitted = true;
		this.close();
		this.onSubmit(this.folderPath);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();

		// If modal was closed without submitting (cancelled), notify with null
		if (!this.submitted) {
			this.onSubmit(null);
		}
	}
}
