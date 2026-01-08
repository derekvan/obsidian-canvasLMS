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
import { UploadPreviewModal } from './modals/upload-preview-modal';
import { FolderPickerModal } from './modals/folder-picker-modal';
import type { CanvasModule, CanvasModuleItem, CanvasFile } from './canvas/types';
import type { ContentType } from './templates/template-types';
import { buildModule, buildHeader, buildPage, buildLink, buildFile, buildAssignment, buildDiscussion, buildInternalLink } from './templates/template-builders';
import { insertAtCursor } from './utils/editor-utils';
import { MarkdownParser } from './upload/parser';
import { CourseUploader } from './upload/uploader';

export default class CanvaslmsHelperPlugin extends Plugin {
	settings: typeof DEFAULT_SETTINGS;

	async onload() {
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

		this.addCommand({
			id: 'upload-course',
			name: 'Upload to Canvas',
			callback: async () => {
				await this.uploadCourse();
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

			notice.hide();

			// 6. Prompt for save location
			const folderPath = await this.promptForFolder();
			if (folderPath === null) return;

			// 7. Save to vault
			await this.saveCourseFile(courseId, courseData.course.name, markdown, folderPath);

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
	 * Prompt user for folder location via modal
	 * Returns folder path or null if cancelled
	 */
	private async promptForFolder(): Promise<string | null> {
		// Get default folder from active file's location
		const activeFile = this.app.workspace.getActiveFile();
		const defaultFolder = activeFile?.parent?.path || '';

		return new Promise((resolve) => {
			const modal = new FolderPickerModal(this.app, defaultFolder, (folderPath) => {
				resolve(folderPath);
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

		// Fetch ALL course files (including those not in modules)
		const allFiles = await this.fetchAllCourseFiles(client, courseId);
		itemsData.set('course_files', allFiles);

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
	 * Fetch all files in a course, regardless of whether they're in modules
	 */
	private async fetchAllCourseFiles(
		client: CanvasApiClient,
		courseId: string
	): Promise<CanvasFile[]> {
		try {
			const folders = await client.getCourseFolders(courseId);
			const allFiles: CanvasFile[] = [];

			for (const folder of folders) {
				try {
					const files = await client.getFolderFiles(folder.id);
					allFiles.push(...files);
				} catch (error) {
					console.warn(`Failed to fetch files from folder "${folder.name}":`, error);
					// Continue with other folders
				}
			}

			return allFiles;
		} catch (error) {
			console.warn('Failed to fetch course files:', error);
			return []; // Return empty array if fetch fails
		}
	}

	/**
	 * Save course markdown to vault
	 */
	private async saveCourseFile(courseId: string, courseName: string, markdown: string, folderPath: string): Promise<void> {
		// Clean course name for filename - remove special characters
		const safeName = courseName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
		const filename = `Canvas Course ${courseId} - ${safeName}.md`;

		// Combine folder path with filename
		const fullPath = folderPath ? `${folderPath}/${filename}` : filename;
		const normalizedPath = normalizePath(fullPath);

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

	/**
	 * Main upload course workflow
	 */
	private async uploadCourse(): Promise<void> {
		// 1. Get active file
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active file. Please open a Canvas course file.');
			return;
		}

		// 2. Validate settings
		if (!this.settings.canvasUrl || !this.settings.canvasToken) {
			new Notice('Please configure Canvas URL and token in settings');
			return;
		}

		// 3. Read file content
		const content = await this.app.vault.read(activeFile);

		// 4. Parse markdown
		const parser = new MarkdownParser(content);
		const { frontmatter, modules } = parser.parse();

		// 5. Validate frontmatter
		if (!frontmatter.canvas_course_id) {
			new Notice('Error: Missing canvas_course_id in frontmatter');
			return;
		}

		if (!frontmatter.canvas_url) {
			new Notice('Error: Missing canvas_url in frontmatter');
			return;
		}

		// 6. Create uploader
		const uploader = new CourseUploader(
			this.settings.canvasUrl,
			this.settings.canvasToken,
			frontmatter.canvas_course_id
		);

		// 7. Show loading notice for preview generation
		const previewNotice = new Notice('Analyzing changes...', 0);

		try {
			// 8. Generate preview (auto dry-run)
			const preview = await uploader.generatePreview(modules);
			previewNotice.hide();

			// 9. Show preview modal
			new UploadPreviewModal(this.app, preview, async () => {
				// 10. On confirm: upload
				const uploadNotice = new Notice('Uploading to Canvas...', 0);

				try {
					const stats = await uploader.upload(modules, false);

					uploadNotice.hide();

					// 11. Show results
					if (stats.errors.length > 0) {
						new Notice(
							`Upload complete with errors: ${stats.itemsCreated} created, ` +
							`${stats.itemsUpdated} updated, ${stats.itemsSkipped} skipped, ` +
							`${stats.errors.length} errors (see console)`,
							10000
						);
						console.error('Upload errors:', stats.errors);
					} else {
						new Notice(
							`Upload complete: ${stats.itemsCreated} created, ` +
							`${stats.itemsUpdated} updated, ${stats.itemsSkipped} skipped`,
							5000
						);
					}
				} catch (error: any) {
					uploadNotice.hide();
					new Notice(`Upload error: ${error.message}`);
					console.error('Canvas upload error:', error);
				}
			}).open();
		} catch (error: any) {
			previewNotice.hide();
			new Notice(`Error generating preview: ${error.message}`);
			console.error('Canvas preview error:', error);
		}
	}

	async onunload() {
		// Cleanup handled automatically by Obsidian
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
