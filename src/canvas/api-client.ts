import { requestUrl } from 'obsidian';
import type {
	CanvasCourse,
	CanvasModule,
	CanvasModuleItem,
	CanvasPage,
	CanvasAssignment,
	CanvasDiscussion,
	CanvasFile,
	CanvasFolder
} from './types';

export class CanvasApiClient {
	private baseUrl: string;
	private token: string;

	constructor(baseUrl: string, token: string) {
		// Remove trailing slash from base URL
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.token = token;
	}

	/**
	 * Make a generic API request to Canvas
	 */
	private async request<T>(endpoint: string): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;

		try {
			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.token}`,
					'Accept': 'application/json'
				}
			});

			if (response.status === 200) {
				return response.json as T;
			} else {
				throw new Error(`HTTP ${response.status}: ${response.text}`);
			}
		} catch (error) {
			// Handle different error types with user-friendly messages
			if (error.status === 401) {
				throw new Error('Invalid Canvas token. Please check your settings.');
			} else if (error.status === 403) {
				throw new Error('Access denied. You may not have permission to view this course.');
			} else if (error.status === 404) {
				throw new Error('Course/resource not found. Check the course ID.');
			} else if (error.message?.includes('net::')) {
				throw new Error('Cannot connect to Canvas. Check your internet connection.');
			} else {
				throw error;
			}
		}
	}

	/**
	 * Make a paginated API request to Canvas, fetching all pages
	 */
	private async requestPaginated<T>(endpoint: string): Promise<T[]> {
		const results: T[] = [];
		// Add per_page parameter to get more items per request
		let url: string | null = `${this.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100`;

		while (url) {
			try {
				const response = await requestUrl({
					url,
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${this.token}`,
						'Accept': 'application/json'
					}
				});

				if (response.status === 200) {
					const data = response.json as T[];
					results.push(...data);

					// Check for next page in Link header
					url = this.getNextPageUrl(response.headers);
				} else {
					throw new Error(`HTTP ${response.status}: ${response.text}`);
				}
			} catch (error) {
				// Handle different error types with user-friendly messages
				if (error.status === 401) {
					throw new Error('Invalid Canvas token. Please check your settings.');
				} else if (error.status === 403) {
					throw new Error('Access denied. You may not have permission to view this course.');
				} else if (error.status === 404) {
					throw new Error('Course/resource not found. Check the course ID.');
				} else if (error.message?.includes('net::')) {
					throw new Error('Cannot connect to Canvas. Check your internet connection.');
				} else {
					throw error;
				}
			}
		}

		return results;
	}

	/**
	 * Parse the Link header to find the next page URL
	 */
	private getNextPageUrl(headers: Record<string, string>): string | null {
		const linkHeader = headers['link'] || headers['Link'];
		if (!linkHeader) return null;

		// Link header format: <url>; rel="next", <url>; rel="last"
		const links = linkHeader.split(',');
		for (const link of links) {
			const match = link.match(/<([^>]+)>;\s*rel="next"/);
			if (match) {
				return match[1];
			}
		}

		return null;
	}

	/**
	 * Get course information
	 */
	async getCourse(courseId: string): Promise<CanvasCourse> {
		return await this.request<CanvasCourse>(`/api/v1/courses/${courseId}`);
	}

	/**
	 * Get all modules in a course (handles pagination)
	 */
	async getModules(courseId: string): Promise<CanvasModule[]> {
		return await this.requestPaginated<CanvasModule>(`/api/v1/courses/${courseId}/modules`);
	}

	/**
	 * Get all items in a module (handles pagination)
	 */
	async getModuleItems(courseId: string, moduleId: string): Promise<CanvasModuleItem[]> {
		return await this.requestPaginated<CanvasModuleItem>(
			`/api/v1/courses/${courseId}/modules/${moduleId}/items`
		);
	}

	/**
	 * Get a specific page by URL slug
	 */
	async getPage(courseId: string, pageUrl: string): Promise<CanvasPage> {
		return await this.request<CanvasPage>(
			`/api/v1/courses/${courseId}/pages/${pageUrl}`
		);
	}

	/**
	 * Get a specific assignment
	 */
	async getAssignment(courseId: string, assignmentId: string): Promise<CanvasAssignment> {
		return await this.request<CanvasAssignment>(
			`/api/v1/courses/${courseId}/assignments/${assignmentId}`
		);
	}

	/**
	 * Get a specific discussion topic
	 */
	async getDiscussion(courseId: string, topicId: string): Promise<CanvasDiscussion> {
		return await this.request<CanvasDiscussion>(
			`/api/v1/courses/${courseId}/discussion_topics/${topicId}`
		);
	}

	/**
	 * Get a specific file
	 */
	async getFile(fileId: string): Promise<CanvasFile> {
		return await this.request<CanvasFile>(`/api/v1/files/${fileId}`);
	}

	/**
	 * Get all folders in a course (includes all subfolders as a flat list)
	 */
	async getCourseFolders(courseId: string): Promise<CanvasFolder[]> {
		return await this.requestPaginated<CanvasFolder>(`/api/v1/courses/${courseId}/folders`);
	}

	/**
	 * Get all files in a folder
	 */
	async getFolderFiles(folderId: number): Promise<CanvasFile[]> {
		return await this.requestPaginated<CanvasFile>(`/api/v1/folders/${folderId}/files`);
	}
}
