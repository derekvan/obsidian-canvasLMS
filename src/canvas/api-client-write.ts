import { requestUrl } from 'obsidian';
import { CanvasApiClient } from './api-client';
import type {
	CanvasModule,
	CanvasPage,
	CanvasAssignment,
	CanvasDiscussion,
	CanvasModuleItem
} from './types';
import type {
	CreateModuleParams,
	UpdateModuleParams,
	CreatePageParams,
	UpdatePageParams,
	CreateAssignmentParams,
	UpdateAssignmentParams,
	CreateDiscussionParams,
	UpdateDiscussionParams,
	CreateModuleItemParams,
	UpdateModuleItemParams
} from '../upload/types';

/**
 * Extended API client with write operations (POST/PUT)
 */
export class CanvasApiClientWrite extends CanvasApiClient {
	private courseId: string;
	private _baseUrl: string;
	private _token: string;

	constructor(baseUrl: string, token: string, courseId: string) {
		super(baseUrl, token);
		this._baseUrl = baseUrl.replace(/\/$/, '');
		this._token = token;
		this.courseId = courseId;
	}

	/**
	 * Make a generic POST/PUT request to Canvas
	 */
	private async writeRequest<T>(
		endpoint: string,
		method: 'POST' | 'PUT',
		params: Record<string, any>
	): Promise<T> {
		const url = `${this._baseUrl}${endpoint}`;

		// Convert params to URLSearchParams for form-data encoding
		const formData = new URLSearchParams();
		this.buildFormData(formData, params);

		try {
			const response = await requestUrl({
				url,
				method,
				headers: {
					'Authorization': `Bearer ${this._token}`,
					'Content-Type': 'application/x-www-form-urlencoded',
					'Accept': 'application/json'
				},
				body: formData.toString()
			});

			if (response.status === 200 || response.status === 201) {
				return response.json as T;
			} else {
				throw new Error(`HTTP ${response.status}: ${response.text}`);
			}
		} catch (error: any) {
			// Handle different error types with user-friendly messages
			if (error.status === 401) {
				throw new Error('Invalid Canvas token. Please check your settings.');
			} else if (error.status === 403) {
				throw new Error('Access denied. You may not have permission to modify this course.');
			} else if (error.status === 404) {
				throw new Error('Resource not found. The Canvas ID may be stale.');
			} else if (error.status === 422) {
				throw new Error(`Validation error: ${error.text || 'Invalid data'}`);
			} else if (error.message?.includes('net::')) {
				throw new Error('Cannot connect to Canvas. Check your internet connection.');
			} else {
				throw error;
			}
		}
	}

	/**
	 * Build form data from params object
	 * Handles nested objects and arrays for Canvas API
	 */
	private buildFormData(formData: URLSearchParams, params: Record<string, any>, prefix = ''): void {
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined || value === null) {
				continue;
			}

			const formKey = prefix ? `${prefix}[${key}]` : key;

			if (Array.isArray(value)) {
				// Array values: append with [] suffix
				value.forEach(item => {
					formData.append(`${formKey}[]`, String(item));
				});
			} else if (typeof value === 'object') {
				// Nested objects: recurse
				this.buildFormData(formData, value, formKey);
			} else {
				// Scalar values
				formData.append(formKey, String(value));
			}
		}
	}

	/**
	 * MODULE OPERATIONS
	 */

	async createModule(params: CreateModuleParams): Promise<CanvasModule> {
		return await this.writeRequest<CanvasModule>(
			`/api/v1/courses/${this.courseId}/modules`,
			'POST',
			{ module: params }
		);
	}

	async updateModule(moduleId: number, params: UpdateModuleParams): Promise<CanvasModule> {
		return await this.writeRequest<CanvasModule>(
			`/api/v1/courses/${this.courseId}/modules/${moduleId}`,
			'PUT',
			{ module: params }
		);
	}

	/**
	 * PAGE OPERATIONS
	 */

	async createPage(params: CreatePageParams): Promise<CanvasPage> {
		return await this.writeRequest<CanvasPage>(
			`/api/v1/courses/${this.courseId}/pages`,
			'POST',
			{ wiki_page: params }
		);
	}

	async updatePage(pageUrl: string, params: UpdatePageParams): Promise<CanvasPage> {
		return await this.writeRequest<CanvasPage>(
			`/api/v1/courses/${this.courseId}/pages/${pageUrl}`,
			'PUT',
			{ wiki_page: params }
		);
	}

	/**
	 * ASSIGNMENT OPERATIONS
	 */

	async createAssignment(params: CreateAssignmentParams): Promise<CanvasAssignment> {
		return await this.writeRequest<CanvasAssignment>(
			`/api/v1/courses/${this.courseId}/assignments`,
			'POST',
			{ assignment: params }
		);
	}

	async updateAssignment(assignmentId: number, params: UpdateAssignmentParams): Promise<CanvasAssignment> {
		return await this.writeRequest<CanvasAssignment>(
			`/api/v1/courses/${this.courseId}/assignments/${assignmentId}`,
			'PUT',
			{ assignment: params }
		);
	}

	/**
	 * DISCUSSION OPERATIONS
	 */

	async createDiscussion(params: CreateDiscussionParams): Promise<CanvasDiscussion> {
		return await this.writeRequest<CanvasDiscussion>(
			`/api/v1/courses/${this.courseId}/discussion_topics`,
			'POST',
			params
		);
	}

	async updateDiscussion(topicId: number, params: UpdateDiscussionParams): Promise<CanvasDiscussion> {
		return await this.writeRequest<CanvasDiscussion>(
			`/api/v1/courses/${this.courseId}/discussion_topics/${topicId}`,
			'PUT',
			params
		);
	}

	/**
	 * MODULE ITEM OPERATIONS
	 */

	async createModuleItem(moduleId: number, params: CreateModuleItemParams): Promise<CanvasModuleItem> {
		return await this.writeRequest<CanvasModuleItem>(
			`/api/v1/courses/${this.courseId}/modules/${moduleId}/items`,
			'POST',
			{ module_item: params }
		);
	}

	async updateModuleItem(
		moduleId: number,
		itemId: number,
		params: UpdateModuleItemParams
	): Promise<CanvasModuleItem> {
		return await this.writeRequest<CanvasModuleItem>(
			`/api/v1/courses/${this.courseId}/modules/${moduleId}/items/${itemId}`,
			'PUT',
			{ module_item: params }
		);
	}
}
