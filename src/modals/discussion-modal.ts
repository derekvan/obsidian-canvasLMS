/**
 * Discussion input modal with grading options
 */

import { App, Modal, Setting } from 'obsidian';
import type { DiscussionData } from '../templates/template-types';

export class DiscussionModal extends Modal {
	private data: DiscussionData = {
		title: '',
		requireInitialPost: false,
		threaded: true,
		graded: false,
		points: 0,
		dueDate: '',
		dueTime: '11:59pm',
		gradeDisplay: 'complete_incomplete'
	};
	private onSubmit: (data: DiscussionData) => void;
	private gradingFields: HTMLElement | null = null;

	constructor(app: App, onSubmit: (data: DiscussionData) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Set modal title
		this.titleEl.setText('Insert Canvas Discussion');

		// Title field (required)
		new Setting(contentEl)
			.setName('Discussion title')
			.setDesc('Required')
			.addText(text => {
				text
					.setPlaceholder('Enter discussion title')
					.onChange(value => {
						this.data.title = value.trim();
					});

				// Auto-focus
				setTimeout(() => text.inputEl.focus(), 10);
			});

		// Require initial post toggle
		new Setting(contentEl)
			.setName('Require initial post')
			.setDesc('Students must post before seeing others\' posts')
			.addToggle(toggle => {
				toggle
					.setValue(false)
					.onChange(value => {
						this.data.requireInitialPost = value;
					});
			});

		// Threaded toggle
		new Setting(contentEl)
			.setName('Threaded')
			.setDesc('Enable threaded replies')
			.addToggle(toggle => {
				toggle
					.setValue(true)
					.onChange(value => {
						this.data.threaded = value;
					});
			});

		// Graded toggle
		new Setting(contentEl)
			.setName('Graded')
			.setDesc('Enable grading for this discussion')
			.addToggle(toggle => {
				toggle
					.setValue(false)
					.onChange(value => {
						this.data.graded = value;
						this.toggleGradingFields(value);
					});
			});

		// Container for conditional grading fields
		this.gradingFields = contentEl.createDiv({ cls: 'grading-fields' });
		this.gradingFields.style.display = 'none';

		// Points field (conditional)
		new Setting(this.gradingFields)
			.setName('Points')
			.setDesc('Points for this discussion')
			.addText(text => {
				text
					.setPlaceholder('0')
					.onChange(value => {
						const num = parseInt(value);
						this.data.points = isNaN(num) ? 0 : num;
					});
			});

		// Due date field (conditional)
		new Setting(this.gradingFields)
			.setName('Due date')
			.setDesc('Format: 2026-01-15')
			.addText(text => {
				text
					.setPlaceholder('YYYY-MM-DD')
					.onChange(value => {
						this.data.dueDate = value.trim();
					});
			});

		// Due time field (conditional)
		new Setting(this.gradingFields)
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

		// Grade display dropdown (conditional)
		new Setting(this.gradingFields)
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

	private toggleGradingFields(show: boolean): void {
		if (this.gradingFields) {
			this.gradingFields.style.display = show ? 'block' : 'none';
		}
	}

	private submit(): void {
		// Validate required field
		if (!this.data.title) {
			const existingError = this.contentEl.querySelector('.template-input-error');
			if (existingError) {
				existingError.remove();
			}
			const errorEl = this.contentEl.createEl('p', {
				text: 'Please enter a discussion title',
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
