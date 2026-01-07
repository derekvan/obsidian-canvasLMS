/**
 * Assignment input modal with full metadata fields
 */

import { App, Modal, Setting } from 'obsidian';
import type { AssignmentData } from '../templates/template-types';

export class AssignmentModal extends Modal {
	private data: AssignmentData = {
		title: '',
		points: 0,
		dueDate: '',
		dueTime: '11:59pm',
		gradeDisplay: 'complete_incomplete',
		submissionTypes: 'online_text_entry'
	};
	private selectedSubmissionTypes: Set<string> = new Set(['online_text_entry']);
	private onSubmit: (data: AssignmentData) => void;

	constructor(app: App, onSubmit: (data: AssignmentData) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Set modal title
		this.titleEl.setText('Insert Canvas Assignment');

		// Title field (required)
		new Setting(contentEl)
			.setName('Assignment title')
			.setDesc('Required')
			.addText(text => {
				text
					.setPlaceholder('Enter assignment title')
					.onChange(value => {
						this.data.title = value.trim();
					});

				// Auto-focus
				setTimeout(() => text.inputEl.focus(), 10);
			});

		// Points field
		new Setting(contentEl)
			.setName('Points')
			.setDesc('Default: 0')
			.addText(text => {
				text
					.setPlaceholder('0')
					.onChange(value => {
						const num = parseInt(value);
						this.data.points = isNaN(num) ? 0 : num;
					});
			});

		// Due date field
		new Setting(contentEl)
			.setName('Due date')
			.setDesc('Format: 2026-01-15 or leave blank')
			.addText(text => {
				text
					.setPlaceholder('YYYY-MM-DD (optional)')
					.onChange(value => {
						this.data.dueDate = value.trim();
					});
			});

		// Due time field
		new Setting(contentEl)
			.setName('Due time')
			.setDesc('Default: 11:59pm')
			.addText(text => {
				text
					.setPlaceholder('11:59pm')
					.setValue('11:59pm')
					.onChange(value => {
						this.data.dueTime = value.trim() || '11:59pm';
					});
			});

		// Grade display dropdown
		new Setting(contentEl)
			.setName('Grade display')
			.setDesc('How grades are displayed')
			.addDropdown(dropdown => {
				dropdown
					.addOption('complete_incomplete', 'Complete/Incomplete')
					.addOption('points', 'Points')
					.addOption('not_graded', 'Not Graded')
					.setValue('complete_incomplete')
					.onChange(value => {
						this.data.gradeDisplay = value as 'complete_incomplete' | 'points' | 'not_graded';
					});
			});

		// Submission types (multiple selection)
		contentEl.createEl('h3', { text: 'Submission types' });
		contentEl.createEl('p', {
			text: 'Select one or more submission methods',
			cls: 'setting-item-description'
		});

		const submissionContainer = contentEl.createDiv({ cls: 'submission-types-container' });

		// Online text entry
		new Setting(submissionContainer)
			.setName('Online text entry')
			.addToggle(toggle => {
				toggle
					.setValue(true)
					.onChange(value => {
						this.toggleSubmissionType('online_text_entry', value);
					});
			});

		// File upload
		new Setting(submissionContainer)
			.setName('File upload')
			.addToggle(toggle => {
				toggle
					.setValue(false)
					.onChange(value => {
						this.toggleSubmissionType('online_upload', value);
					});
			});

		// URL submission
		new Setting(submissionContainer)
			.setName('URL submission')
			.addToggle(toggle => {
				toggle
					.setValue(false)
					.onChange(value => {
						this.toggleSubmissionType('online_url', value);
					});
			});

		// Media recording
		new Setting(submissionContainer)
			.setName('Media recording')
			.addToggle(toggle => {
				toggle
					.setValue(false)
					.onChange(value => {
						this.toggleSubmissionType('media_recording', value);
					});
			});

		// No submission
		new Setting(submissionContainer)
			.setName('No submission')
			.addToggle(toggle => {
				toggle
					.setValue(false)
					.onChange(value => {
						this.toggleSubmissionType('none', value);
					});
			});

		// On paper
		new Setting(submissionContainer)
			.setName('On paper')
			.addToggle(toggle => {
				toggle
					.setValue(false)
					.onChange(value => {
						this.toggleSubmissionType('on_paper', value);
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

	private toggleSubmissionType(type: string, enabled: boolean): void {
		if (enabled) {
			this.selectedSubmissionTypes.add(type);
		} else {
			this.selectedSubmissionTypes.delete(type);
		}
		// Update the data with comma-separated list
		this.data.submissionTypes = Array.from(this.selectedSubmissionTypes).join(', ');
	}

	private submit(): void {
		// Validate required field
		if (!this.data.title) {
			const existingError = this.contentEl.querySelector('.template-input-error');
			if (existingError) {
				existingError.remove();
			}
			const errorEl = this.contentEl.createEl('p', {
				text: 'Please enter an assignment title',
				cls: 'template-input-error'
			});
			errorEl.style.color = 'var(--text-error)';
			return;
		}

		// Validate at least one submission type is selected
		if (this.selectedSubmissionTypes.size === 0) {
			const existingError = this.contentEl.querySelector('.template-input-error');
			if (existingError) {
				existingError.remove();
			}
			const errorEl = this.contentEl.createEl('p', {
				text: 'Please select at least one submission type',
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
