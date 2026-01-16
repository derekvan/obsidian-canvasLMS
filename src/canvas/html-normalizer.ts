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
		'&lsquo;': "'",
		'&rsquo;': "'",
		'&ldquo;': '"',
		'&rdquo;': '"',
		'&hellip;': '...',
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
 * Normalize Unicode characters for comparison
 * Converts smart quotes, dashes, etc. to their ASCII equivalents
 */
function normalizeUnicode(text: string): string {
	return text
		// Smart quotes to straight quotes
		.replace(/[\u2018\u2019\u201A\u201B]/g, "'")  // ' ' ‚ ‛ → '
		.replace(/[\u201C\u201D\u201E\u201F]/g, '"')  // " " „ ‟ → "
		// Dashes to hyphens
		.replace(/[\u2013\u2014\u2015]/g, '-')  // – — ― → -
		// Ellipsis to three dots
		.replace(/\u2026/g, '...')
		// Non-breaking space to regular space
		.replace(/\u00A0/g, ' ');
}

/**
 * Strip all HTML tags from content
 * Replaces <br> tags with spaces to preserve word boundaries
 */
function stripHtmlTags(html: string): string {
	// Replace <br> tags with space first (to preserve word boundaries)
	let result = html.replace(/<br\s*\/?>/gi, ' ');
	// Then strip all other tags
	result = result.replace(/<[^>]+>/g, '');
	return result;
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
 * 3. Normalize Unicode (smart quotes → straight quotes, etc.)
 * 4. Remove markdown escape backslashes (e.g., \_ → _)
 * 5. Remove brackets around URLs (Canvas sometimes stores [url] as link text)
 * 6. Normalize spaces around dashes (Turndown may add spaces)
 * 7. Normalize whitespace
 * 8. Lowercase for case-insensitive comparison
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

	// 3. Normalize Unicode (smart quotes, dashes, etc.)
	normalized = normalizeUnicode(normalized);

	// 4. Remove markdown escape backslashes (Turndown escapes special chars like _ * [ ] etc.)
	normalized = normalized.replace(/\\([_*\[\]\\`#+-])/g, '$1');

	// 5. Normalize markdown link patterns and bracketed/parenthesized URLs
	// Canvas may store [url](url) partially converted, resulting in various forms
	// Convert [url](url) pattern to just url (when link text equals the URL)
	normalized = normalized.replace(/\[(https?:\/\/[^\]]+)\]\(\1\)/g, '$1');
	// Remove remaining brackets around URLs: [https://...] → https://...
	normalized = normalized.replace(/\[(https?:\/\/[^\]]+)\]/g, '$1');
	// Remove remaining parens around URLs: (https://...) → https://...
	normalized = normalized.replace(/\((https?:\/\/[^)]+)\)/g, '$1');

	// 6. Normalize underscores used as blank placeholders
	// Remove underscores adjacent to brackets (like _[text]_ or [text]_)
	normalized = normalized.replace(/_+(\[)/g, '$1');
	normalized = normalized.replace(/(\])_+/g, '$1');
	// Collapse multiple consecutive underscores to nothing (blank lines like ____)
	normalized = normalized.replace(/__{2,}/g, '');
	// Remove standalone underscores (surrounded by spaces)
	normalized = normalized.replace(/\s_+\s/g, ' ');

	// 7. Normalize spaces around dashes/hyphens (Turndown may add spaces)
	// "word- word" and "word -word" and "word - word" all become "word-word"
	normalized = normalized.replace(/\s*-\s*/g, '-');

	// 8. Normalize whitespace
	normalized = normalizeWhitespace(normalized);

	// 9. Lowercase for case-insensitive comparison
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

	// 0. Remove markdown escape backslashes FIRST (Turndown escapes special chars)
	// This ensures \[...\](...) becomes [...](...) which can then be converted to <a> tags
	html = html.replace(/\\([_*\[\]\\`#+()\-!])/g, '$1');

	// 1. Headers (MUST BE FIRST to avoid conflicts, and in order from most # to least)
	// Unshift by 2 levels to reverse the +2 shift applied during download
	html = html.replace(/^######\s+(.+)$/gm, '<h4>$1</h4>');
	html = html.replace(/^#####\s+(.+)$/gm, '<h3>$1</h3>');
	html = html.replace(/^####\s+(.+)$/gm, '<h2>$1</h2>');
	html = html.replace(/^###\s+(.+)$/gm, '<h1>$1</h1>');
	html = html.replace(/^##\s+(.+)$/gm, '<h1>$1</h1>');
	html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

	// 2. Images (BEFORE links to avoid ![alt](url) being matched as link)
	html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');

	// 3. Lists (BEFORE bold/italic to avoid conflicts with * markdown)
	// Unordered lists
	html = html.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
	html = html.replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>');
	// Numbered lists (1. 2. etc)
	html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
	// Wrap consecutive list items (simplified - treats all as ul for comparison purposes)
	html = html.replace(/(<li>.*<\/li>\s*)+/gs, '<ul>$&</ul>');
	// Remove newlines between list items to prevent <br> tags being added later
	html = html.replace(/(<\/li>)\n+(<li>)/g, '$1$2');

	// 4. Links
	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

	// 5. Bold (BEFORE italic to handle ** before *)
	html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

	// 6. Italic
	html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
	html = html.replace(/_(.+?)_/g, '<em>$1</em>');

	// 7. Code
	html = html.replace(/`(.+?)`/g, '<code>$1</code>');

	// 8. Convert single newlines within blocks to <br> tags (BEFORE splitting into paragraphs)
	// This handles hard line breaks within a paragraph (markdown: two trailing spaces + newline)
	// But first, temporarily protect double newlines from being converted
	html = html.replace(/\n\s*\n/g, '<<<PARAGRAPH_BREAK>>>');
	html = html.replace(/\n/g, '<br>\n');
	html = html.replace(/<<<PARAGRAPH_BREAK>>>/g, '\n\n');

	// 9. Paragraph breaks - split on double newlines and wrap each block
	const blocks = html.split(/\n\s*\n/);
	html = blocks.map(block => {
		const trimmed = block.trim();
		if (!trimmed) return '';
		// Don't wrap if already a block element
		if (trimmed.match(/^<(h[1-6]|ul|ol|li|div|p|blockquote|img)/)) {
			return trimmed;
		}
		return `<p>${trimmed}</p>`;
	}).filter(b => b).join('');

	return html;
}
