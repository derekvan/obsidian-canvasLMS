/**
 * Pure functions to generate Canvas markdown from template data
 */

import type {
	ModuleData,
	HeaderData,
	PageData,
	LinkData,
	FileData,
	AssignmentData,
	DiscussionData,
	InternalLinkData
} from './template-types';

/**
 * Build a module (H1 header)
 */
export function buildModule(data: ModuleData): string {
	return `# ${data.title}\n`;
}

/**
 * Build a header (H2 with [header] marker)
 */
export function buildHeader(data: HeaderData): string {
	return `\n## [header] ${data.title}\n`;
}

/**
 * Build a page (H2 with [page] marker)
 */
export function buildPage(data: PageData): string {
	return `\n## [page] ${data.title}\n`;
}

/**
 * Build an external link (H2 with [link] marker + URL)
 */
export function buildLink(data: LinkData): string {
	return `\n## [link] ${data.title}\nurl: ${data.url}\n`;
}

/**
 * Build a file reference (H2 with [file] marker + filename)
 */
export function buildFile(data: FileData): string {
	return `\n## [file] ${data.title}\nfilename: ${data.filename}\n`;
}

/**
 * Build an assignment (H2 with [assignment] marker + metadata)
 */
export function buildAssignment(data: AssignmentData): string {
	let md = `\n## [assignment] ${data.title}\n`;

	// Add metadata fields (only if different from defaults)
	if (data.points !== undefined && data.points !== 0) {
		md += `points: ${data.points}\n`;
	}

	if (data.dueDate) {
		const time = data.dueTime || '11:59pm';
		md += `due: ${data.dueDate} ${time}\n`;
	}

	if (data.gradeDisplay && data.gradeDisplay !== 'complete_incomplete') {
		md += `grade_display: ${data.gradeDisplay}\n`;
	}

	if (data.submissionTypes && data.submissionTypes !== 'online_text_entry') {
		md += `submission_types: ${data.submissionTypes}\n`;
	}

	// Add blank line before ---
	md += '\n---\n';
	return md;
}

/**
 * Build a discussion (H2 with [discussion] marker + metadata)
 */
export function buildDiscussion(data: DiscussionData): string {
	let md = `\n## [discussion] ${data.title}\n`;

	// Add metadata fields
	if (data.requireInitialPost !== undefined) {
		md += `require_initial_post: ${data.requireInitialPost}\n`;
	}

	if (data.threaded !== undefined && data.threaded !== true) {
		// Only include if not default (true)
		md += `threaded: ${data.threaded}\n`;
	}

	if (data.graded !== undefined) {
		md += `graded: ${data.graded}\n`;
	}

	// Only include grading fields if graded is true
	if (data.graded) {
		if (data.points !== undefined) {
			md += `points: ${data.points}\n`;
		}

		if (data.dueDate) {
			const time = data.dueTime || '11:59pm';
			md += `due: ${data.dueDate} ${time}\n`;
		}

		if (data.gradeDisplay) {
			md += `grade_display: ${data.gradeDisplay}\n`;
		}
	}

	// Add blank line before ---
	md += '\n---\n';
	return md;
}

/**
 * Build an internal link ([[Type:Name]] format)
 */
export function buildInternalLink(data: InternalLinkData): string {
	return `[[${data.type}:${data.name}]]`;
}
