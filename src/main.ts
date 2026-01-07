import { Plugin, Notice, TFile, normalizePath, Editor, MarkdownView } from 'obsidian';
import { SettingsTab, DEFAULT_SETTINGS } from './settings';
import { CanvasApiClient } from './canvas/api-client';
import { CanvasCourseFormatter } from './canvas/formatter';
import { CourseInputModal } from './modals/course-input-modal';
import { SimpleTextModal } from './modals/simple-text-modal';
import { TwoFieldModal } from './modals/two-field-modal';
import { AssignmentModal } from './modals/assignment-modal';
import { DiscussionModal } from './modals/discussion-modal';
import { InternalLinkModal } from './modals/internal-link-modal';
import { ContentTypeModal } from './modals/content-type-modal';
import type { CanvasModule, CanvasModuleItem } from './canvas/types';
import type { ContentType } from './templates/template-types';
import { buildModule, buildHeader, buildPage, buildLink, buildFile, buildAssignment, buildDiscussion, buildInternalLink } from './templates/template-builders';
import { insertAtCursor } from './utils/editor-utils';

export default class CanvaslmsHelperPlugin extends Plugin {
	settings: typeof DEFAULT_SETTINGS;

	async onload() {
		// TODO: Remove console.log after testing
		console.log('Loading canvasLMS-helper');

		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new SettingsTab(this.app, this));

		// Register commands
		this.addCommand({
			id: 'download-course',
			name: 'Download course',
			callback: async () => {
				await this.downloadCourse();
			}
		});

		// Template insertion commands
		this.addCommand({
			id: 'canvas-insert-module',
			name: 'Insert Canvas Module',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.insertModule(editor);
			}
		});

		this.addCommand({
			id: 'canvas-insert-header',
			name: 'Insert Canvas Header',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.insertHeader(editor);
			}
		});

		this.addCommand({
			id: 'canvas-insert-page',
			name: 'Insert Canvas Page',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.insertPage(editor);
			}
		});

		this.addCommand({
			id: 'canvas-insert-link',
			name: 'Insert Canvas Link',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.insertLink(editor);
			}
		});

		this.addCommand({
			id: 'canvas-insert-file',
			name: 'Insert Canvas File',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.insertFile(editor);
			}
		});

		this.addCommand({
			id: 'canvas-insert-assignment',
			name: 'Insert Canvas Assignment',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.insertAssignment(editor);
			}
		});

		this.addCommand({
			id: 'canvas-insert-discussion',
			name: 'Insert Canvas Discussion',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.insertDiscussion(editor);
			}
		});

		this.addCommand({
			id: 'canvas-insert-internal-link',
			name: 'Insert Canvas Internal Link',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.insertInternalLink(editor);
			}
		});

		// Meta-command for content type selection
		this.addCommand({
			id: 'canvas-add-content',
			name: 'Add Canvas Content',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.addContent(editor);
			}
		});
	}

	/**
	 * Main download course workflow
	 */
	private async downloadCourse(): Promise<void> {
		// 1. Validate settings
		if (!this.settings.canvasUrl || !this.settings.canvasToken) {
			new Notice('Please configure Canvas URL and token in settings');
			return;
		}

		// 2. Prompt for course ID
		const courseId = await this.promptForCourseId();
		if (!courseId) return;

		// 3. Show loading notice
		const notice = new Notice('Downloading course from Canvas...', 0);

		try {
			// 4. Fetch all data from Canvas
			const client = new CanvasApiClient(this.settings.canvasUrl, this.settings.canvasToken);
			const courseData = await this.fetchCourseData(client, courseId);

			// 5. Format as Markdown
			const formatter = new CanvasCourseFormatter();
			const markdown = formatter.formatCourse(
				courseId,
				this.settings.canvasUrl,
				courseData.modules,
				courseData.itemsData
			);

			// 6. Save to vault
			await this.saveCourseFile(courseId, courseData.course.name, markdown);

			notice.hide();
			new Notice('Course downloaded successfully!');
		} catch (error) {
			notice.hide();
			new Notice(`Error: ${error.message}`);
			console.error('Canvas download error:', error);
		}
	}

	/**
	 * Prompt user for course ID via modal
	 */
	private async promptForCourseId(): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new CourseInputModal(this.app, (courseId) => {
				resolve(courseId);
			});
			modal.open();
		});
	}

	/**
	 * Fetch all course data from Canvas
	 */
	private async fetchCourseData(client: CanvasApiClient, courseId: string) {
		// Fetch course info
		const course = await client.getCourse(courseId);

		// Fetch all modules
		const modules = await client.getModules(courseId);

		// Fetch all module items and their details
		const itemsData = new Map<string, any>();

		for (const module of modules) {
			const items = await client.getModuleItems(courseId, module.id.toString());
			itemsData.set(`module_${module.id}`, items);

			// Fetch detailed content for each item
			for (const item of items) {
				await this.fetchItemDetails(client, courseId, item, itemsData);
			}
		}

		return { course, modules, itemsData };
	}

	/**
	 * Fetch detailed content for a module item based on its type
	 */
	private async fetchItemDetails(
		client: CanvasApiClient,
		courseId: string,
		item: CanvasModuleItem,
		itemsData: Map<string, any>
	): Promise<void> {
		try {
			switch (item.type) {
				case 'Page':
					if (item.page_url) {
						const page = await client.getPage(courseId, item.page_url);
						itemsData.set(`page_${item.page_url}`, page);
					}
					break;
				case 'Assignment':
					if (item.content_id) {
						const assignment = await client.getAssignment(courseId, item.content_id.toString());
						itemsData.set(`assignment_${item.content_id}`, assignment);
					}
					break;
				case 'Discussion':
					if (item.content_id) {
						const discussion = await client.getDiscussion(courseId, item.content_id.toString());
						itemsData.set(`discussion_${item.content_id}`, discussion);
					}
					break;
				case 'File':
					if (item.content_id) {
						const file = await client.getFile(item.content_id.toString());
						itemsData.set(`file_${item.content_id}`, file);
					}
					break;
			}
		} catch (error) {
			console.warn(`Failed to fetch details for ${item.type} "${item.title}":`, error);
			// Continue with other items even if one fails
		}
	}

	/**
	 * Save course markdown to vault
	 */
	private async saveCourseFile(courseId: string, courseName: string, markdown: string): Promise<void> {
		// Clean course name for filename - remove special characters
		const safeName = courseName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
		const filename = `Canvas Course ${courseId} - ${safeName}.md`;
		const normalizedPath = normalizePath(filename);

		// Check if file exists
		const existingFile = this.app.vault.getAbstractFileByPath(normalizedPath);

		if (existingFile instanceof TFile) {
			// Overwrite existing file
			await this.app.vault.modify(existingFile, markdown);
		} else {
			// Create new file
			await this.app.vault.create(normalizedPath, markdown);
		}

		// Open the file in a new leaf
		const file = this.app.vault.getAbstractFileByPath(normalizedPath);
		if (file instanceof TFile) {
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		}
	}

	async onunload() {
		// TODO: Remove console.log after testing
		console.log('Unloading canvasLMS-helper');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Template insertion commands
	 */
	private async insertModule(editor: Editor): Promise<void> {
		const modal = new SimpleTextModal(
			this.app,
			'Insert Canvas Module',
			'Module title',
			'Enter module title (e.g., Week 1 - Introduction)',
			(title) => {
				const markdown = buildModule({ title });
				insertAtCursor(editor, markdown);
				new Notice('Module inserted');
			}
		);
		modal.open();
	}

	private async insertHeader(editor: Editor): Promise<void> {
		const modal = new SimpleTextModal(
			this.app,
			'Insert Canvas Header',
			'Header text',
			'Enter header text',
			(title) => {
				const markdown = buildHeader({ title });
				insertAtCursor(editor, markdown);
				new Notice('Header inserted');
			}
		);
		modal.open();
	}

	private async insertPage(editor: Editor): Promise<void> {
		const modal = new SimpleTextModal(
			this.app,
			'Insert Canvas Page',
			'Page title',
			'Enter page title',
			(title) => {
				const markdown = buildPage({ title });
				insertAtCursor(editor, markdown);
				new Notice('Page inserted');
			}
		);
		modal.open();
	}

	private async insertLink(editor: Editor): Promise<void> {
		const modal = new TwoFieldModal(
			this.app,
			'Insert Canvas Link',
			'Link title',
			'Enter link title',
			'URL',
			'Enter URL (e.g., https://example.com)',
			(data) => {
				const markdown = buildLink({ title: data.field1, url: data.field2 });
				insertAtCursor(editor, markdown);
				new Notice('Link inserted');
			}
		);
		modal.open();
	}

	private async insertFile(editor: Editor): Promise<void> {
		const modal = new TwoFieldModal(
			this.app,
			'Insert Canvas File',
			'Display title',
			'Enter display title',
			'Filename',
			'Enter filename (e.g., document.pdf)',
			(data) => {
				const markdown = buildFile({ title: data.field1, filename: data.field2 });
				insertAtCursor(editor, markdown);
				new Notice('File inserted');
			}
		);
		modal.open();
	}

	private async insertAssignment(editor: Editor): Promise<void> {
		const modal = new AssignmentModal(
			this.app,
			(data) => {
				const markdown = buildAssignment(data);
				insertAtCursor(editor, markdown);
				new Notice('Assignment inserted');
			}
		);
		modal.open();
	}

	private async insertDiscussion(editor: Editor): Promise<void> {
		const modal = new DiscussionModal(
			this.app,
			(data) => {
				const markdown = buildDiscussion(data);
				insertAtCursor(editor, markdown);
				new Notice('Discussion inserted');
			}
		);
		modal.open();
	}

	private async insertInternalLink(editor: Editor): Promise<void> {
		const modal = new InternalLinkModal(
			this.app,
			(data) => {
				const markdown = buildInternalLink(data);
				insertAtCursor(editor, markdown);
				new Notice('Internal link inserted');
			}
		);
		modal.open();
	}

	/**
	 * Meta-command: opens type picker then delegates to appropriate insert method
	 */
	private async addContent(editor: Editor): Promise<void> {
		const modal = new ContentTypeModal(
			this.app,
			async (type: ContentType) => {
				// Delegate to appropriate insert method based on selected type
				switch (type) {
					case 'module':
						await this.insertModule(editor);
						break;
					case 'header':
						await this.insertHeader(editor);
						break;
					case 'page':
						await this.insertPage(editor);
						break;
					case 'link':
						await this.insertLink(editor);
						break;
					case 'file':
						await this.insertFile(editor);
						break;
					case 'assignment':
						await this.insertAssignment(editor);
						break;
					case 'discussion':
						await this.insertDiscussion(editor);
						break;
					case 'internal-link':
						await this.insertInternalLink(editor);
						break;
				}
			}
		);
		modal.open();
	}
}
