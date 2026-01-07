import TurndownService from 'turndown';

// Configure Turndown service with Obsidian-friendly settings
const turndownService = new TurndownService({
	headingStyle: 'atx',
	hr: '---',
	bulletListMarker: '-',
	codeBlockStyle: 'fenced',
	emDelimiter: '*'
});

// Add custom rules for Canvas-specific HTML elements
turndownService.addRule('removeCanvasWrappers', {
	filter: (node: HTMLElement) => {
		// Remove Canvas LMS wrapper divs that don't add semantic value
		return node.nodeName === 'DIV' &&
		       (node.getAttribute('class')?.includes('user_content') ?? false);
	},
	replacement: (content: string) => content
});

/**
 * Convert HTML to Markdown
 * @param html HTML string from Canvas API
 * @returns Clean Markdown string
 */
export function htmlToMarkdown(html: string): string {
	if (!html) return '';

	try {
		return turndownService.turndown(html).trim();
	} catch (error) {
		console.error('Error converting HTML to Markdown:', error);
		// Fallback: strip HTML tags if conversion fails
		return html.replace(/<[^>]+>/g, '').trim();
	}
}

/**
 * Shift heading levels down by specified amount
 * e.g., with shift=2: # becomes ###, ## becomes ####
 * This prevents conflicts when content is nested under a ## [type] header
 */
function shiftHeadingLevels(markdown: string, shift: number): string {
	const prefix = '#'.repeat(shift);
	// Match markdown headings at start of line
	return markdown.replace(/^(#{1,6})\s/gm, `${prefix}$1 `);
}

/**
 * Convert HTML to Markdown with heading levels shifted for nested content
 * Use this for page/assignment/discussion content that sits under ## [type] headers
 * @param html HTML string from Canvas API
 * @returns Clean Markdown string with headings shifted down by 2 levels
 */
export function htmlToMarkdownNested(html: string): string {
	const markdown = htmlToMarkdown(html);
	return shiftHeadingLevels(markdown, 2);
}
