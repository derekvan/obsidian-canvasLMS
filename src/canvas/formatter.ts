import type {
	CanvasModule,
	CanvasModuleItem,
	CanvasPage,
	CanvasAssignment,
	CanvasDiscussion,
	CanvasFile
} from './types';
import { htmlToMarkdown } from '../utils/html-to-markdown';

export class CanvasCourseFormatter {
	/**
	 * Format complete course data into Markdown
	 */
	formatCourse(
		courseId: string,
		canvasUrl: string,
		modules: CanvasModule[],
		itemsData: Map<string, any>
	): string {
		let markdown = '';

		// Add YAML frontmatter
		markdown += this.formatFrontmatter(courseId, canvasUrl);
		markdown += '\n';

		// Process each module
		for (const module of modules) {
			markdown += this.formatModule(module, itemsData);
		}

		return markdown;
	}

	/**
	 * Format YAML frontmatter
	 */
	private formatFrontmatter(courseId: string, canvasUrl: string): string {
		return `---
canvas_course_id: ${courseId}
canvas_url: ${canvasUrl}/courses/${courseId}
---`;
	}

	/**
	 * Format a module and its items
	 */
	private formatModule(module: CanvasModule, itemsData: Map<string, any>): string {
		let markdown = `\n# ${module.name}\n`;
		markdown += `<!-- canvas_module_id: ${module.id} -->\n`;

		const items = itemsData.get(`module_${module.id}`) as CanvasModuleItem[] | undefined;

		if (items && items.length > 0) {
			for (const item of items) {
				markdown += this.formatModuleItem(item, itemsData);
			}
		}

		return markdown;
	}

	/**
	 * Format a module item based on its type
	 */
	private formatModuleItem(item: CanvasModuleItem, itemsData: Map<string, any>): string {
		switch (item.type) {
			case 'SubHeader':
				return this.formatHeader(item);
			case 'Page':
				return this.formatPage(item, itemsData);
			case 'ExternalUrl':
				return this.formatLink(item);
			case 'File':
				return this.formatFile(item, itemsData);
			case 'Assignment':
				return this.formatAssignment(item, itemsData);
			case 'Discussion':
				return this.formatDiscussion(item, itemsData);
			default:
				console.warn(`Unknown module item type: ${item.type}`);
				return '';
		}
	}

	/**
	 * Format a header (SubHeader in Canvas)
	 */
	private formatHeader(item: CanvasModuleItem): string {
		return `\n## [header] ${item.title}\n` +
		       `<!-- canvas_module_item_id: ${item.id} -->\n`;
	}

	/**
	 * Format a page
	 */
	private formatPage(item: CanvasModuleItem, itemsData: Map<string, any>): string {
		const page = itemsData.get(`page_${item.page_url}`) as CanvasPage | undefined;

		let markdown = `\n## [page] ${item.title}\n`;

		if (page) {
			markdown += `<!-- canvas_page_id: ${page.url} -->\n`;
		}
		markdown += `<!-- canvas_module_item_id: ${item.id} -->\n`;

		if (page?.body) {
			const bodyMarkdown = htmlToMarkdown(page.body);
			if (bodyMarkdown) {
				markdown += bodyMarkdown + '\n';
			}
		}

		return markdown;
	}

	/**
	 * Format an external link
	 */
	private formatLink(item: CanvasModuleItem): string {
		return `\n## [link] ${item.title}\n` +
		       `<!-- canvas_module_item_id: ${item.id} -->\n` +
		       `url: ${item.external_url || ''}\n`;
	}

	/**
	 * Format a file
	 */
	private formatFile(item: CanvasModuleItem, itemsData: Map<string, any>): string {
		const file = itemsData.get(`file_${item.content_id}`) as CanvasFile | undefined;

		let markdown = `\n## [file] ${item.title}\n`;

		if (file) {
			markdown += `<!-- canvas_file_id: ${file.id} -->\n`;
		}
		markdown += `<!-- canvas_module_item_id: ${item.id} -->\n`;

		if (file?.filename) {
			markdown += `filename: ${file.filename}\n`;
		}

		return markdown;
	}

	/**
	 * Format an assignment
	 */
	private formatAssignment(item: CanvasModuleItem, itemsData: Map<string, any>): string {
		const assignment = itemsData.get(`assignment_${item.content_id}`) as CanvasAssignment | undefined;

		let markdown = `\n## [assignment] ${item.title}\n`;

		if (assignment) {
			markdown += `<!-- canvas_assignment_id: ${assignment.id} -->\n`;
		}
		markdown += `<!-- canvas_module_item_id: ${item.id} -->\n`;

		if (assignment) {
			// Add metadata
			if (assignment.points_possible !== null && assignment.points_possible !== undefined) {
				markdown += `points: ${assignment.points_possible}\n`;
			}

			if (assignment.due_at) {
				const dueDate = this.formatDate(assignment.due_at);
				markdown += `due: ${dueDate}\n`;
			}

			if (assignment.grading_type) {
				markdown += `grade_display: ${assignment.grading_type}\n`;
			}

			if (assignment.submission_types && assignment.submission_types.length > 0) {
				markdown += `submission_types: ${assignment.submission_types.join(', ')}\n`;
			}

			// Add description if present
			if (assignment.description) {
				markdown += '\n---\n';
				const descriptionMarkdown = htmlToMarkdown(assignment.description);
				if (descriptionMarkdown) {
					markdown += descriptionMarkdown + '\n';
				}
			}
		}

		return markdown;
	}

	/**
	 * Format a discussion
	 */
	private formatDiscussion(item: CanvasModuleItem, itemsData: Map<string, any>): string {
		const discussion = itemsData.get(`discussion_${item.content_id}`) as CanvasDiscussion | undefined;

		let markdown = `\n## [discussion] ${item.title}\n`;

		if (discussion) {
			markdown += `<!-- canvas_discussion_id: ${discussion.id} -->\n`;
		}
		markdown += `<!-- canvas_module_item_id: ${item.id} -->\n`;

		if (discussion) {
			// Add metadata
			markdown += `require_initial_post: ${discussion.require_initial_post}\n`;
			markdown += `threaded: ${discussion.discussion_type === 'threaded'}\n`;

			// Check if graded
			const isGraded = discussion.assignment !== undefined;
			markdown += `graded: ${isGraded}\n`;

			if (isGraded && discussion.assignment) {
				markdown += `points: ${discussion.assignment.points_possible}\n`;

				if (discussion.assignment.due_at) {
					const dueDate = this.formatDate(discussion.assignment.due_at);
					markdown += `due: ${dueDate}\n`;
				}
			}

			// Add message if present
			if (discussion.message) {
				markdown += '\n---\n';
				const messageMarkdown = htmlToMarkdown(discussion.message);
				if (messageMarkdown) {
					markdown += messageMarkdown + '\n';
				}
			}
		}

		return markdown;
	}

	/**
	 * Format ISO date to "2026-01-20 02:00pm" format
	 */
	private formatDate(isoDate: string): string {
		const date = new Date(isoDate);

		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');

		let hours = date.getHours();
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const ampm = hours >= 12 ? 'pm' : 'am';
		hours = hours % 12 || 12;

		return `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${minutes}${ampm}`;
	}
}
