import { Plugin, Notice, TFile, normalizePath } from 'obsidian';
import { SettingsTab, DEFAULT_SETTINGS } from './settings';
import { CanvasApiClient } from './canvas/api-client';
import { CanvasCourseFormatter } from './canvas/formatter';
import { CourseInputModal } from './modals/course-input-modal';
import type { CanvasModule, CanvasModuleItem } from './canvas/types';

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
}
