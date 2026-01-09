/**
 * Extract Canvas course ID from markdown frontmatter
 * Returns course ID if found, null otherwise
 */
export function extractCanvasCourseId(content: string): string | null {
	const lines = content.split('\n');
	let inFrontmatter = false;

	for (const line of lines) {
		if (line.trim() === '---') {
			if (!inFrontmatter) {
				inFrontmatter = true;
				continue;
			} else {
				break; // End of frontmatter
			}
		}

		if (inFrontmatter) {
			const match = line.match(/^canvas_course_id:\s*(.+)$/);
			if (match) {
				return match[1].trim();
			}
		}
	}

	return null;
}
