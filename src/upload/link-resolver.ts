/**
 * Resolve internal [[Type:Name]] links to Canvas URLs
 */

export class LinkResolver {
	private registry: Map<string, string>;

	constructor() {
		this.registry = new Map();
	}

	/**
	 * Register a content item with its Canvas URL
	 */
	register(type: string, title: string, canvasUrl: string): void {
		const key = this.makeKey(type, title);
		this.registry.set(key, canvasUrl);
	}

	/**
	 * Resolve [[Type:Title]] links in content to Canvas URLs
	 */
	resolve(content: string): { resolved: string; hasLinks: boolean } {
		if (!content) {
			return { resolved: content, hasLinks: false };
		}

		let hasLinks = false;
		let resolved = content;

		// Pattern: [[Type:Title]] or [[type:title]]
		const linkPattern = /\[\[(\w+):([^\]]+)\]\]/g;

		resolved = content.replace(linkPattern, (match, type, title) => {
			const key = this.makeKey(type, title);
			const url = this.registry.get(key);

			if (url) {
				hasLinks = true;
				// Replace with HTML link
				return `<a href="${url}">${title.trim()}</a>`;
			} else {
				// Link not found - log warning and leave as plain text
				console.warn(`Link not found: ${match}`);
				return title.trim(); // Return just the title as plain text
			}
		});

		return { resolved, hasLinks };
	}

	/**
	 * Check if content has internal links
	 */
	hasInternalLinks(content: string): boolean {
		if (!content) return false;
		return /\[\[(\w+):([^\]]+)\]\]/.test(content);
	}

	/**
	 * Make registry key from type and title (normalized)
	 */
	private makeKey(type: string, title: string): string {
		// Normalize: lowercase type, trim title
		return `${type.toLowerCase()}:${title.trim().toLowerCase()}`;
	}

	/**
	 * Clear the registry
	 */
	clear(): void {
		this.registry.clear();
	}

	/**
	 * Get all registered items (for debugging)
	 */
	getRegistry(): Map<string, string> {
		return new Map(this.registry);
	}
}
