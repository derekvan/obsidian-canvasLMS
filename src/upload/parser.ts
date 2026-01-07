import type {
	ParsedModule,
	ParsedModuleItem,
	ParsedPage,
	ParsedAssignment,
	ParsedDiscussion,
	ParsedHeader,
	ParsedLink,
	ParsedFile,
	CourseFrontmatter
} from './types';

/**
 * Parse markdown file into structured data with Canvas IDs
 */
export class MarkdownParser {
	private content: string;
	private lines: string[];
	private currentLine: number = 0;

	constructor(content: string) {
		this.content = content;
		this.lines = content.split('\n');
	}

	/**
	 * Parse the entire markdown file
	 */
	parse(): { frontmatter: CourseFrontmatter; modules: ParsedModule[] } {
		const frontmatter = this.parseFrontmatter();
		const modules = this.parseModules();

		return { frontmatter, modules };
	}

	/**
	 * Parse YAML frontmatter
	 */
	private parseFrontmatter(): CourseFrontmatter {
		const frontmatter: Partial<CourseFrontmatter> = {};

		// Skip to frontmatter start
		if (this.lines[this.currentLine]?.trim() === '---') {
			this.currentLine++;

			while (this.currentLine < this.lines.length) {
				const line = this.lines[this.currentLine];

				// End of frontmatter
				if (line.trim() === '---') {
					this.currentLine++;
					break;
				}

				// Parse key: value
				const match = line.match(/^(\w+):\s*(.+)$/);
				if (match) {
					const [, key, value] = match;
					if (key === 'canvas_course_id' || key === 'canvas_url') {
						frontmatter[key] = value.trim();
					}
				}

				this.currentLine++;
			}
		}

		return frontmatter as CourseFrontmatter;
	}

	/**
	 * Parse all modules
	 */
	private parseModules(): ParsedModule[] {
		const modules: ParsedModule[] = [];

		while (this.currentLine < this.lines.length) {
			const line = this.lines[this.currentLine];

			// Module header (H1)
			if (line.startsWith('# ')) {
				const module = this.parseModule();
				modules.push(module);
			} else {
				this.currentLine++;
			}
		}

		return modules;
	}

	/**
	 * Parse a single module
	 */
	private parseModule(): ParsedModule {
		const titleLine = this.lines[this.currentLine];
		const title = titleLine.replace(/^#\s+/, '').trim();
		this.currentLine++;

		// Check for Canvas module ID
		let canvasModuleId: number | undefined;
		if (this.currentLine < this.lines.length) {
			const commentMatch = this.lines[this.currentLine].match(/<!--\s*canvas_module_id:\s*(\d+)\s*-->/);
			if (commentMatch) {
				canvasModuleId = parseInt(commentMatch[1], 10);
				this.currentLine++;
			}
		}

		// Parse module items
		const items: ParsedModuleItem[] = [];
		while (this.currentLine < this.lines.length) {
			const line = this.lines[this.currentLine];

			// Stop at next module
			if (line.startsWith('# ')) {
				break;
			}

			// Module item (H2)
			if (line.startsWith('## ')) {
				const item = this.parseModuleItem();
				if (item) {
					items.push(item);
				}
			} else {
				this.currentLine++;
			}
		}

		return { title, canvasModuleId, items };
	}

	/**
	 * Parse a single module item
	 */
	private parseModuleItem(): ParsedModuleItem | null {
		const titleLine = this.lines[this.currentLine];

		// Extract type and title: "## [type] Title"
		const match = titleLine.match(/^##\s+\[(\w+)\]\s+(.+)$/);
		if (!match) {
			this.currentLine++;
			return null;
		}

		const [, type, title] = match;
		this.currentLine++;

		switch (type.toLowerCase()) {
			case 'page':
				return this.parsePage(title);
			case 'assignment':
				return this.parseAssignment(title);
			case 'discussion':
				return this.parseDiscussion(title);
			case 'header':
				return this.parseHeader(title);
			case 'link':
				return this.parseLink(title);
			case 'file':
				return this.parseFile(title);
			default:
				console.warn(`Unknown item type: ${type}`);
				return null;
		}
	}

	/**
	 * Parse Canvas IDs and module item ID from comments
	 */
	private parseIds(): { canvasId?: string | number; moduleItemId?: number } {
		const ids: { canvasId?: string | number; moduleItemId?: number } = {};

		while (this.currentLine < this.lines.length) {
			const line = this.lines[this.currentLine];

			// Stop at non-comment lines
			if (!line.trim().startsWith('<!--')) {
				break;
			}

			// Parse various ID types
			const pageIdMatch = line.match(/<!--\s*canvas_page_id:\s*(\S+)\s*-->/);
			if (pageIdMatch) {
				ids.canvasId = pageIdMatch[1];
				this.currentLine++;
				continue;
			}

			const assignmentIdMatch = line.match(/<!--\s*canvas_assignment_id:\s*(\d+)\s*-->/);
			if (assignmentIdMatch) {
				ids.canvasId = parseInt(assignmentIdMatch[1], 10);
				this.currentLine++;
				continue;
			}

			const discussionIdMatch = line.match(/<!--\s*canvas_discussion_id:\s*(\d+)\s*-->/);
			if (discussionIdMatch) {
				ids.canvasId = parseInt(discussionIdMatch[1], 10);
				this.currentLine++;
				continue;
			}

			const fileIdMatch = line.match(/<!--\s*canvas_file_id:\s*(\d+)\s*-->/);
			if (fileIdMatch) {
				ids.canvasId = parseInt(fileIdMatch[1], 10);
				this.currentLine++;
				continue;
			}

			const moduleItemIdMatch = line.match(/<!--\s*canvas_module_item_id:\s*(\d+)\s*-->/);
			if (moduleItemIdMatch) {
				ids.moduleItemId = parseInt(moduleItemIdMatch[1], 10);
				this.currentLine++;
				continue;
			}

			// Unknown comment, skip
			this.currentLine++;
		}

		return ids;
	}

	/**
	 * Unescape markdown content (handle escaped brackets)
	 */
	private unescapeMarkdown(content: string): string {
		// Unescape square brackets that were escaped in the formatter
		return content
			.replace(/\\\[/g, '[')
			.replace(/\\\]/g, ']');
	}

	/**
	 * Parse metadata fields and content
	 */
	private parseMetadataAndContent(): { metadata: Record<string, any>; content: string } {
		const metadata: Record<string, any> = {};
		let content = '';
		let inContent = false;

		while (this.currentLine < this.lines.length) {
			const line = this.lines[this.currentLine];

			// Stop at next module (H1) or next module item (H2 with [type] prefix)
			// But allow regular H2/H3/etc headings within content
			if (line.startsWith('# ') || this.isModuleItemHeader(line)) {
				break;
			}

			// Content separator
			if (line.trim() === '---') {
				inContent = true;
				this.currentLine++;
				continue;
			}

			if (inContent) {
				// Collect content lines
				content += line + '\n';
			} else {
				// Parse metadata: "key: value"
				const metaMatch = line.match(/^(\w+):\s*(.+)$/);
				if (metaMatch) {
					const [, key, value] = metaMatch;
					metadata[key] = this.parseMetadataValue(key, value);
				}
			}

			this.currentLine++;
		}

		return { metadata, content: this.unescapeMarkdown(content.trim()) };
	}

	/**
	 * Parse metadata value (handle different types)
	 */
	private parseMetadataValue(key: string, value: string): any {
		// Null value
		if (value === 'null') return null;

		// Boolean fields
		if (value === 'true') return true;
		if (value === 'false') return false;

		// Number fields
		if (key === 'points' && /^\d+(\.\d+)?$/.test(value)) {
			return parseFloat(value);
		}

		// Date fields
		if (key === 'due') {
			return this.parseDate(value);
		}

		// Array fields
		if (key === 'submission_types') {
			return value.split(',').map(s => s.trim());
		}

		// Default: return as string
		return value;
	}

	/**
	 * Parse date from various formats to ISO 8601
	 * Formats: "2026-01-20 11:59pm", "2026-01-20", ISO 8601
	 */
	private parseDate(dateStr: string): string | undefined {
		if (!dateStr) return undefined;

		try {
			// Format: "2026-01-20 11:59pm" or "2026-01-20 02:00am"
			const timeMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})(am|pm)$/i);
			if (timeMatch) {
				const [, datePart, hourStr, minuteStr, ampm] = timeMatch;
				let hour = parseInt(hourStr, 10);
				const minute = parseInt(minuteStr, 10);

				// Convert to 24-hour format
				if (ampm.toLowerCase() === 'pm' && hour !== 12) {
					hour += 12;
				} else if (ampm.toLowerCase() === 'am' && hour === 12) {
					hour = 0;
				}

				const date = new Date(`${datePart}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
				return date.toISOString();
			}

			// Format: "2026-01-20" (date only)
			if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
				const date = new Date(`${dateStr}T00:00:00`);
				return date.toISOString();
			}

			// Try parsing as ISO 8601 or other standard formats
			const date = new Date(dateStr);
			if (!isNaN(date.getTime())) {
				return date.toISOString();
			}

			console.warn(`Could not parse date: ${dateStr}`);
			return undefined;
		} catch (error) {
			console.warn(`Error parsing date "${dateStr}":`, error);
			return undefined;
		}
	}

	/**
	 * Parse a page item
	 */
	private parsePage(title: string): ParsedPage {
		const ids = this.parseIds();

		// Pages have content directly after IDs (no metadata, no --- separator)
		let content = '';
		while (this.currentLine < this.lines.length) {
			const line = this.lines[this.currentLine];

			// Stop at next module (H1) or next module item (H2 with [type] prefix)
			// But allow regular H2/H3/etc headings within page content
			if (line.startsWith('# ') || this.isModuleItemHeader(line)) {
				break;
			}

			// Collect content lines
			content += line + '\n';
			this.currentLine++;
		}

		return {
			type: 'page',
			title,
			canvasPageId: ids.canvasId as string | undefined,
			canvasModuleItemId: ids.moduleItemId,
			body: this.unescapeMarkdown(content.trim())
		};
	}

	/**
	 * Check if a line is a module item header (## [type] Title)
	 */
	private isModuleItemHeader(line: string): boolean {
		return /^##\s+\[(page|assignment|discussion|header|link|file)\]\s+/.test(line);
	}

	/**
	 * Parse an assignment item
	 */
	private parseAssignment(title: string): ParsedAssignment {
		const ids = this.parseIds();
		const { metadata, content } = this.parseMetadataAndContent();

		return {
			type: 'assignment',
			title,
			canvasAssignmentId: ids.canvasId as number | undefined,
			canvasModuleItemId: ids.moduleItemId,
			description: content,
			pointsPossible: metadata.points,
			dueAt: metadata.due,
			gradingType: metadata.grade_display,
			submissionTypes: metadata.submission_types
		};
	}

	/**
	 * Parse a discussion item
	 */
	private parseDiscussion(title: string): ParsedDiscussion {
		const ids = this.parseIds();
		const { metadata, content } = this.parseMetadataAndContent();

		return {
			type: 'discussion',
			title,
			canvasDiscussionId: ids.canvasId as number | undefined,
			canvasModuleItemId: ids.moduleItemId,
			message: content,
			requireInitialPost: metadata.require_initial_post ?? null,
			threaded: metadata.threaded ?? true,
			graded: metadata.graded ?? false,
			pointsPossible: metadata.points,
			dueAt: metadata.due
		};
	}

	/**
	 * Parse a header item
	 */
	private parseHeader(title: string): ParsedHeader {
		const ids = this.parseIds();
		this.parseMetadataAndContent(); // Skip any content

		return {
			type: 'header',
			title,
			canvasModuleItemId: ids.moduleItemId
		};
	}

	/**
	 * Parse a link item
	 */
	private parseLink(title: string): ParsedLink {
		const ids = this.parseIds();
		const { metadata } = this.parseMetadataAndContent();

		return {
			type: 'link',
			title,
			canvasModuleItemId: ids.moduleItemId,
			url: metadata.url || ''
		};
	}

	/**
	 * Parse a file item
	 */
	private parseFile(title: string): ParsedFile {
		const ids = this.parseIds();
		const { metadata } = this.parseMetadataAndContent();

		return {
			type: 'file',
			title,
			canvasFileId: ids.canvasId as number | undefined,
			canvasModuleItemId: ids.moduleItemId,
			filename: metadata.filename
		};
	}
}
