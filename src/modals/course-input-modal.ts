import { App, Modal, Setting } from 'obsidian';

export class CourseInputModal extends Modal {
	private courseId: string = '';
	private onSubmit: (courseId: string) => void;

	constructor(app: App, onSubmit: (courseId: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.empty();

		// Set modal title
		this.titleEl.setText('Download Canvas course');

		// Add description
		contentEl.createEl('p', {
			text: 'Enter the Canvas course ID (number from course URL)'
		});

		contentEl.createEl('p', {
			text: 'Example: 126998',
			cls: 'mod-muted'
		});

		// Create input setting
		const inputSetting = new Setting(contentEl)
			.setName('Course ID')
			.addText(text => {
				text
					.setPlaceholder('Enter course ID')
					.onChange(value => {
						this.courseId = value.trim();
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
			text: 'Download',
			cls: 'mod-cta'
		});
		submitButton.addEventListener('click', () => this.submit());

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.addEventListener('click', () => this.close());
	}

	private submit(): void {
		// Validate that course ID is numeric
		if (!this.courseId) {
			// Show error in the modal
			const existingError = this.contentEl.querySelector('.course-input-error');
			if (existingError) {
				existingError.remove();
			}
			const errorEl = this.contentEl.createEl('p', {
				text: 'Please enter a course ID',
				cls: 'course-input-error'
			});
			errorEl.style.color = 'var(--text-error)';
			return;
		}

		if (!/^\d+$/.test(this.courseId)) {
			const existingError = this.contentEl.querySelector('.course-input-error');
			if (existingError) {
				existingError.remove();
			}
			const errorEl = this.contentEl.createEl('p', {
				text: 'Course ID must be a number',
				cls: 'course-input-error'
			});
			errorEl.style.color = 'var(--text-error)';
			return;
		}

		this.close();
		this.onSubmit(this.courseId);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
