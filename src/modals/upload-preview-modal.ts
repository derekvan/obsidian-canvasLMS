import { App, Modal, Setting } from 'obsidian';
import type { PreviewItem } from '../upload/types';

/**
 * Modal to display upload preview before confirming
 */
export class UploadPreviewModal extends Modal {
	private preview: PreviewItem[];
	private onConfirm: () => void;

	constructor(app: App, preview: PreviewItem[], onConfirm: () => void) {
		super(app);
		this.preview = preview;
		this.onConfirm = onConfirm;
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.empty();

		// Set modal title
		this.titleEl.setText('Upload preview');

		// Add description
		contentEl.createEl('p', {
			text: 'Review changes before uploading to Canvas:'
		});

		// Create scrollable preview container
		const previewContainer = contentEl.createDiv({ cls: 'upload-preview-container' });

		// Render preview items
		for (const item of this.preview) {
			this.renderPreviewItem(previewContainer, item);
		}

		// Calculate totals
		const totals = this.calculateTotals();

		// Add summary
		const summary = contentEl.createDiv({ cls: 'upload-preview-summary' });
		summary.createEl('strong', { text: 'Summary: ' });
		summary.createEl('span', {
			text: `${totals.create} to create, ${totals.update} to update, ${totals.skip} unchanged`,
			cls: 'mod-muted'
		});

		// Add buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const uploadButton = buttonContainer.createEl('button', {
			text: 'Upload to Canvas',
			cls: 'mod-cta'
		});
		uploadButton.addEventListener('click', () => {
			this.close();
			this.onConfirm();
		});

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.addEventListener('click', () => this.close());
	}

	/**
	 * Render a single preview item (module)
	 */
	private renderPreviewItem(container: HTMLElement, item: PreviewItem): void {
		const moduleDiv = container.createDiv({ cls: 'upload-preview-module' });

		// Module header
		const moduleHeader = moduleDiv.createDiv({ cls: 'upload-preview-module-header' });

		moduleHeader.createEl('strong', { text: `[Module] ${item.moduleTitle}` });

		if (item.modulAction && item.modulAction !== 'skip') {
			const actionBadge = moduleHeader.createEl('span', {
				cls: `upload-preview-badge upload-preview-badge-${item.modulAction}`
			});
			actionBadge.setText(item.modulAction.toUpperCase());

			if (item.moduleChangedFields && item.moduleChangedFields.length > 0) {
				moduleHeader.createEl('span', {
					text: ` (${item.moduleChangedFields.join(', ')})`,
					cls: 'mod-muted'
				});
			}
		}

		// Module items
		for (const detail of item.items) {
			this.renderItemDetail(moduleDiv, detail);
		}
	}

	/**
	 * Render a single item detail
	 */
	private renderItemDetail(container: HTMLElement, detail: any): void {
		const itemDiv = container.createDiv({ cls: 'upload-preview-item' });

		// Item line
		const itemLine = itemDiv.createDiv({ cls: 'upload-preview-item-line' });

		// Indent bullet
		itemLine.createEl('span', { text: '  • ', cls: 'upload-preview-bullet' });

		// Type and title
		itemLine.createEl('span', {
			text: `[${detail.type}] ${detail.title}`,
			cls: 'upload-preview-item-title'
		});

		// Action badge
		const actionBadge = itemLine.createEl('span', {
			cls: `upload-preview-badge upload-preview-badge-${detail.action}`
		});
		actionBadge.setText(detail.action.toUpperCase());

		// Changed fields
		if (detail.changedFields && detail.changedFields.length > 0) {
			itemLine.createEl('span', {
				text: ` (${detail.changedFields.join(', ')})`,
				cls: 'mod-muted'
			});
		}

		// Metadata
		if (detail.metadata && Object.keys(detail.metadata).length > 0) {
			const metadataDiv = itemDiv.createDiv({ cls: 'upload-preview-metadata' });

			for (const [key, value] of Object.entries(detail.metadata)) {
				metadataDiv.createEl('div', {
					text: `      ${key}: ${value}`,
					cls: 'upload-preview-metadata-line'
				});
			}
		}
	}

	/**
	 * Calculate totals for summary
	 */
	private calculateTotals(): { create: number; update: number; skip: number } {
		let create = 0;
		let update = 0;
		let skip = 0;

		for (const item of this.preview) {
			// Count module action
			if (item.modulAction === 'create') create++;
			else if (item.modulAction === 'update') update++;
			else if (item.modulAction === 'skip') skip++;

			// Count item actions
			for (const detail of item.items) {
				if (detail.action === 'create') create++;
				else if (detail.action === 'update') update++;
				else if (detail.action === 'skip') skip++;
			}
		}

		return { create, update, skip };
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
