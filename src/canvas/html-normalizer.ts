/**
 * HTML normalization utilities for semantic comparison
 * Prevents false positives from formatting differences
 */

/**
 * Decode HTML entities to their character equivalents
 */
function decodeHtmlEntities(text: string): string {
	const entities: Record<string, string> = {
		'&nbsp;': ' ',
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&apos;': "'",
		'&ndash;': '–',
		'&mdash;': '—',
	};

	let decoded = text;
	for (const [entity, char] of Object.entries(entities)) {
		decoded = decoded.replace(new RegExp(entity, 'g'), char);
	}

	// Decode numeric entities (e.g., &#39; or &#x27;)
	decoded = decoded.replace(/&#(\d+);/g, (_, num) => {
		return String.fromCharCode(parseInt(num, 10));
	});
	decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
		return String.fromCharCode(parseInt(hex, 16));
	});

	return decoded;
}

/**
 * Strip all HTML tags from content
 */
function stripHtmlTags(html: string): string {
	return html.replace(/<[^>]+>/g, '');
}

/**
 * Normalize whitespace (multiple spaces → single space)
 */
function normalizeWhitespace(text: string): string {
	return text
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Normalize HTML content for semantic comparison
 *
 * Process:
 * 1. Decode HTML entities
 * 2. Strip all HTML tags
 * 3. Normalize whitespace
 * 4. Lowercase for case-insensitive comparison
 *
 * This ensures "Hello **world**" (markdown) matches "<p>Hello <strong>world</strong></p>" (HTML)
 */
export function normalizeHtml(content: string): string {
	if (!content) return '';

	let normalized = content;

	// 1. Decode HTML entities
	normalized = decodeHtmlEntities(normalized);

	// 2. Strip HTML tags
	normalized = stripHtmlTags(normalized);

	// 3. Normalize whitespace
	normalized = normalizeWhitespace(normalized);

	// 4. Lowercase for case-insensitive comparison
	normalized = normalized.toLowerCase();

	return normalized;
}

/**
 * Compare two HTML/text contents semantically
 * Returns true if they are semantically equivalent
 */
export function compareHtmlContent(content1: string, content2: string): boolean {
	const normalized1 = normalizeHtml(content1);
	const normalized2 = normalizeHtml(content2);

	return normalized1 === normalized2;
}

/**
 * Convert markdown to HTML for comparison purposes
 * This is a simple implementation that handles basic markdown
 * For full markdown conversion, use a proper markdown parser
 */
export function markdownToSimpleHtml(markdown: string): string {
	if (!markdown) return '';

	let html = markdown;

	// 1. Headers (MUST BE FIRST to avoid conflicts)
	html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
	html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
	html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
	html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

	// 2. Lists (BEFORE bold/italic to avoid conflicts with * markdown)
	// Wrap consecutive list items in <ul> tags
	html = html.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
	html = html.replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>');
	html = html.replace(/(<li>.*<\/li>\s*)+/gs, '<ul>$&</ul>');

	// 3. Links
	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

	// 4. Bold (BEFORE italic to handle ** before *)
	html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

	// 5. Italic
	html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
	html = html.replace(/_(.+?)_/g, '<em>$1</em>');

	// 6. Code
	html = html.replace(/`(.+?)`/g, '<code>$1</code>');

	// 7. Paragraph breaks - split on double newlines and wrap each block
	const blocks = html.split(/\n\s*\n/);
	html = blocks.map(block => {
		const trimmed = block.trim();
		if (!trimmed) return '';
		// Don't wrap if already a block element
		if (trimmed.match(/^<(h[1-6]|ul|ol|li|div|p|blockquote)/)) {
			return trimmed;
		}
		return `<p>${trimmed}</p>`;
	}).filter(b => b).join('\n');

	// 8. Convert remaining single newlines to <br> tags
	html = html.replace(/\n/g, '<br>\n');

	return html;
}
