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
