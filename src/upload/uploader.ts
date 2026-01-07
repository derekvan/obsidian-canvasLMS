import { CanvasApiClient } from '../canvas/api-client';
import { CanvasApiClientWrite } from '../canvas/api-client-write';
import { LinkResolver } from './link-resolver';
import { compareModule, comparePage, compareAssignment, compareDiscussion, setComparatorDebug } from './comparator';
import { markdownToSimpleHtml } from '../canvas/html-normalizer';
import type {
	ParsedModule,
	ParsedModuleItem,
	ParsedPage,
	ParsedAssignment,
	ParsedDiscussion,
	ParsedHeader,
	ParsedLink,
	ParsedFile,
	UploadStats,
	UploadError,
	PreviewItem,
	PreviewItemDetail
} from './types';
import type {
	CanvasModule,
	CanvasPage,
	CanvasAssignment,
	CanvasDiscussion
} from '../canvas/types';

/**
 * Three-phase upload orchestrator
 */
export class CourseUploader {
	private apiClient: CanvasApiClient;
	private apiClientWrite: CanvasApiClientWrite;
	private linkResolver: LinkResolver;
	private courseId: string;
	private debug: boolean = false;

	constructor(baseUrl: string, token: string, courseId: string, debug = false) {
		this.apiClient = new CanvasApiClient(baseUrl, token);
		this.apiClientWrite = new CanvasApiClientWrite(baseUrl, token, courseId);
		this.linkResolver = new LinkResolver();
		this.courseId = courseId;
		this.debug = debug;
	}

	/**
	 * Enable debug logging
	 */
	setDebug(enabled: boolean): void {
		this.debug = enabled;
		setComparatorDebug(enabled);
	}

	private log(...args: any[]): void {
		if (this.debug) {
			console.log('[CourseUploader]', ...args);
		}
	}

	/**
	 * Generate preview of changes (dry-run)
	 */
	async generatePreview(modules: ParsedModule[]): Promise<PreviewItem[]> {
		const preview: PreviewItem[] = [];

		this.log('=== STARTING PREVIEW GENERATION ===');
		this.log(`Total modules to process: ${modules.length}`);

		// Fetch existing Canvas data for comparison
		const canvasData = await this.fetchCanvasData(modules);
		this.log(`Fetched Canvas data entries: ${canvasData.size}`);

		for (const module of modules) {
			this.log(`\n--- Processing module: "${module.title}" ---`);
			this.log(`Module Canvas ID: ${module.canvasModuleId || 'NONE (will create)'}`);
			const previewItem = await this.generateModulePreview(module, canvasData);
			preview.push(previewItem);
		}

		this.log('\n=== PREVIEW GENERATION COMPLETE ===');
		return preview;
	}

	/**
	 * Generate preview for a single module
	 */
	private async generateModulePreview(
		module: ParsedModule,
		canvasData: Map<string, any>
	): Promise<PreviewItem> {
		// Compare module
		const canvasModule = module.canvasModuleId
			? canvasData.get(`module_${module.canvasModuleId}`) as CanvasModule | undefined
			: undefined;

		const moduleComparison = compareModule(module, canvasModule);

		// Compare items
		const itemPreviews: PreviewItemDetail[] = [];
		for (const item of module.items) {
			const itemPreview = await this.generateItemPreview(item, canvasData);
			itemPreviews.push(itemPreview);
		}

		return {
			moduleTitle: module.title,
			modulAction: moduleComparison.action,
			moduleChangedFields: moduleComparison.changedFields,
			items: itemPreviews
		};
	}

	/**
	 * Generate preview for a single item
	 */
	private async generateItemPreview(
		item: ParsedModuleItem,
		canvasData: Map<string, any>
	): Promise<PreviewItemDetail> {
		let comparison;
		let metadata: Record<string, any> = {};

		this.log(`  Processing item [${item.type}]: "${item.title}"`);

		switch (item.type) {
			case 'page': {
				const page = item as ParsedPage;
				this.log(`    Canvas Page ID: ${page.canvasPageId || 'NONE'}`);
				const canvasPage = page.canvasPageId
					? canvasData.get(`page_${page.canvasPageId}`) as CanvasPage | undefined
					: undefined;
				this.log(`    Canvas data found: ${!!canvasPage}`);
				if (canvasPage) {
					this.log(`    Canvas title: "${canvasPage.title}"`);
					this.log(`    Parsed title: "${page.title}"`);
					this.log(`    Canvas body length: ${canvasPage.body?.length || 0}`);
					this.log(`    Parsed body length: ${page.body?.length || 0}`);
				}
				comparison = comparePage(page, canvasPage);
				this.log(`    Action: ${comparison.action}, Changed fields: [${comparison.changedFields.join(', ')}]`);
				break;
			}
			case 'assignment': {
				const assignment = item as ParsedAssignment;
				this.log(`    Canvas Assignment ID: ${assignment.canvasAssignmentId || 'NONE'}`);
				const canvasAssignment = assignment.canvasAssignmentId
					? canvasData.get(`assignment_${assignment.canvasAssignmentId}`) as CanvasAssignment | undefined
					: undefined;
				this.log(`    Canvas data found: ${!!canvasAssignment}`);
				if (canvasAssignment) {
					this.log(`    Canvas name: "${canvasAssignment.name}"`);
					this.log(`    Parsed title: "${assignment.title}"`);
					this.log(`    Canvas description length: ${canvasAssignment.description?.length || 0}`);
					this.log(`    Parsed description length: ${assignment.description?.length || 0}`);
					this.log(`    Canvas points: ${canvasAssignment.points_possible}`);
					this.log(`    Parsed points: ${assignment.pointsPossible}`);
				}
				comparison = compareAssignment(assignment, canvasAssignment);
				this.log(`    Action: ${comparison.action}, Changed fields: [${comparison.changedFields.join(', ')}]`);

				// Add metadata for preview
				if (assignment.pointsPossible !== undefined) {
					metadata.points = assignment.pointsPossible;
				}
				if (assignment.dueAt) {
					metadata.due = assignment.dueAt;
				}
				if (assignment.gradingType) {
					metadata.grading_type = assignment.gradingType;
				}
				break;
			}
			case 'discussion': {
				const discussion = item as ParsedDiscussion;
				this.log(`    Canvas Discussion ID: ${discussion.canvasDiscussionId || 'NONE'}`);
				const canvasDiscussion = discussion.canvasDiscussionId
					? canvasData.get(`discussion_${discussion.canvasDiscussionId}`) as CanvasDiscussion | undefined
					: undefined;
				this.log(`    Canvas data found: ${!!canvasDiscussion}`);
				if (canvasDiscussion) {
					this.log(`    Canvas title: "${canvasDiscussion.title}"`);
					this.log(`    Parsed title: "${discussion.title}"`);
					this.log(`    Canvas message length: ${canvasDiscussion.message?.length || 0}`);
					this.log(`    Parsed message length: ${discussion.message?.length || 0}`);
					this.log(`    Canvas require_initial_post: ${canvasDiscussion.require_initial_post}`);
					this.log(`    Parsed require_initial_post: ${discussion.requireInitialPost}`);
					this.log(`    Canvas threaded: ${canvasDiscussion.discussion_type === 'threaded'}`);
					this.log(`    Parsed threaded: ${discussion.threaded}`);
					this.log(`    Canvas graded: ${canvasDiscussion.assignment !== undefined}`);
					this.log(`    Parsed graded: ${discussion.graded}`);
				}
				comparison = compareDiscussion(discussion, canvasDiscussion);
				this.log(`    Action: ${comparison.action}, Changed fields: [${comparison.changedFields.join(', ')}]`);

				// Add metadata for preview
				metadata.require_initial_post = discussion.requireInitialPost;
				if (discussion.graded && discussion.pointsPossible !== undefined) {
					metadata.points = discussion.pointsPossible;
				}
				break;
			}
			case 'header':
			case 'link':
			case 'file':
				this.log(`    Canvas Module Item ID: ${item.canvasModuleItemId || 'NONE'}`);
				// These types are always created/skipped (no updates)
				comparison = {
					hasChanges: item.canvasModuleItemId === undefined,
					changedFields: [],
					action: item.canvasModuleItemId === undefined ? 'create' as const : 'skip' as const
				};
				this.log(`    Action: ${comparison.action}`);
				break;
		}

		return {
			type: item.type,
			title: item.title,
			action: comparison.action,
			changedFields: comparison.changedFields,
			metadata: Object.keys(metadata).length > 0 ? metadata : undefined
		};
	}

	/**
	 * Upload course content (three-phase workflow)
	 */
	async upload(modules: ParsedModule[], dryRun = false): Promise<UploadStats> {
		const stats: UploadStats = {
			itemsCreated: 0,
			itemsUpdated: 0,
			itemsSkipped: 0,
			errors: []
		};

		if (dryRun) {
			// Dry run handled by generatePreview
			return stats;
		}

		// Clear link resolver
		this.linkResolver.clear();

		// Fetch existing Canvas data for comparison
		const canvasData = await this.fetchCanvasData(modules);

		// Track items needing link resolution
		const itemsNeedingLinks: Array<{ type: string; id: number | string; content: string }> = [];

		// PHASE 1: Create/Update Content
		for (const module of modules) {
			await this.uploadModule(module, canvasData, stats, itemsNeedingLinks);
		}

		// PHASE 2: Resolve Internal Links
		await this.resolveLinks(itemsNeedingLinks, stats);

		// PHASE 3: Module Positions
		await this.updateModulePositions(modules, stats);

		return stats;
	}

	/**
	 * Fetch existing Canvas data for comparison
	 */
	private async fetchCanvasData(modules: ParsedModule[]): Promise<Map<string, any>> {
		const data = new Map<string, any>();

		try {
			// Fetch all modules
			const canvasModules = await this.apiClient.getModules(this.courseId);
			for (const module of canvasModules) {
				data.set(`module_${module.id}`, module);
			}

			// Fetch content for items that have Canvas IDs
			for (const module of modules) {
				for (const item of module.items) {
					try {
						if (item.type === 'page' && (item as ParsedPage).canvasPageId) {
							const page = await this.apiClient.getPage(this.courseId, (item as ParsedPage).canvasPageId!);
							data.set(`page_${page.url}`, page);
						} else if (item.type === 'assignment' && (item as ParsedAssignment).canvasAssignmentId) {
							const assignment = await this.apiClient.getAssignment(
								this.courseId,
								String((item as ParsedAssignment).canvasAssignmentId)
							);
							data.set(`assignment_${assignment.id}`, assignment);
						} else if (item.type === 'discussion' && (item as ParsedDiscussion).canvasDiscussionId) {
							const discussion = await this.apiClient.getDiscussion(
								this.courseId,
								String((item as ParsedDiscussion).canvasDiscussionId)
							);
							data.set(`discussion_${discussion.id}`, discussion);
						}
					} catch (error) {
						// Stale ID - ignore and treat as CREATE
						console.warn(`Failed to fetch Canvas data for item: ${item.title}`, error);
					}
				}
			}
		} catch (error) {
			// Graceful degradation: if fetch fails, proceed with update anyway
			console.warn('Failed to fetch Canvas data, proceeding with upload', error);
		}

		return data;
	}

	/**
	 * Upload a single module and its items
	 */
	private async uploadModule(
		module: ParsedModule,
		canvasData: Map<string, any>,
		stats: UploadStats,
		itemsNeedingLinks: Array<{ type: string; id: number | string; content: string }>
	): Promise<number> {
		let moduleId = module.canvasModuleId;

		try {
			// Compare and update module
			const canvasModule = moduleId
				? canvasData.get(`module_${moduleId}`) as CanvasModule | undefined
				: undefined;

			const moduleComparison = compareModule(module, canvasModule);

			if (moduleComparison.action === 'create') {
				const created = await this.apiClientWrite.createModule({ name: module.title });
				moduleId = created.id;
				stats.itemsCreated++;
			} else if (moduleComparison.action === 'update') {
				await this.apiClientWrite.updateModule(moduleId!, { name: module.title });
				stats.itemsUpdated++;
			} else {
				stats.itemsSkipped++;
			}

			// Upload items
			for (const item of module.items) {
				await this.uploadItem(item, moduleId!, canvasData, stats, itemsNeedingLinks);
			}
		} catch (error: any) {
			stats.errors.push({
				itemType: 'module',
				itemTitle: module.title,
				error: error.message || String(error)
			});
		}

		return moduleId!;
	}

	/**
	 * Upload a single item
	 */
	private async uploadItem(
		item: ParsedModuleItem,
		moduleId: number,
		canvasData: Map<string, any>,
		stats: UploadStats,
		itemsNeedingLinks: Array<{ type: string; id: number | string; content: string }>
	): Promise<void> {
		try {
			switch (item.type) {
				case 'page':
					await this.uploadPage(item as ParsedPage, moduleId, canvasData, stats, itemsNeedingLinks);
					break;
				case 'assignment':
					await this.uploadAssignment(item as ParsedAssignment, moduleId, canvasData, stats, itemsNeedingLinks);
					break;
				case 'discussion':
					await this.uploadDiscussion(item as ParsedDiscussion, moduleId, canvasData, stats, itemsNeedingLinks);
					break;
				case 'header':
					await this.uploadHeader(item as ParsedHeader, moduleId, stats);
					break;
				case 'link':
					await this.uploadLink(item as ParsedLink, moduleId, stats);
					break;
				case 'file':
					// Files cannot be uploaded via API, skip
					stats.itemsSkipped++;
					break;
			}
		} catch (error: any) {
			stats.errors.push({
				itemType: item.type,
				itemTitle: item.title,
				error: error.message || String(error)
			});
		}
	}

	/**
	 * Upload a page
	 */
	private async uploadPage(
		page: ParsedPage,
		moduleId: number,
		canvasData: Map<string, any>,
		stats: UploadStats,
		itemsNeedingLinks: Array<{ type: string; id: number | string; content: string }>
	): Promise<void> {
		const canvasPage = page.canvasPageId
			? canvasData.get(`page_${page.canvasPageId}`) as CanvasPage | undefined
			: undefined;

		const comparison = comparePage(page, canvasPage);

		if (comparison.action === 'create') {
			const created = await this.apiClientWrite.createPage({
				title: page.title,
				body: markdownToSimpleHtml(page.body),
				published: true
			});
			stats.itemsCreated++;

			// Register URL for link resolution
			const url = `${this.apiClientWrite['_baseUrl']}/courses/${this.courseId}/pages/${created.url}`;
			this.linkResolver.register('page', page.title, url);

			// Check if content needs link resolution
			if (this.linkResolver.hasInternalLinks(page.body)) {
				itemsNeedingLinks.push({ type: 'page', id: created.url, content: page.body });
			}

			// Add to module
			if (!page.canvasModuleItemId) {
				await this.apiClientWrite.createModuleItem(moduleId, {
					title: page.title,
					type: 'Page',
					page_url: created.url
				});
			}
		} else if (comparison.action === 'update') {
			await this.apiClientWrite.updatePage(page.canvasPageId!, {
				title: page.title,
				body: markdownToSimpleHtml(page.body)
			});
			stats.itemsUpdated++;

			// Register URL for link resolution
			const url = `${this.apiClientWrite['_baseUrl']}/courses/${this.courseId}/pages/${page.canvasPageId}`;
			this.linkResolver.register('page', page.title, url);

			// Check if content needs link resolution
			if (this.linkResolver.hasInternalLinks(page.body)) {
				itemsNeedingLinks.push({ type: 'page', id: page.canvasPageId!, content: page.body });
			}
		} else {
			stats.itemsSkipped++;

			// Still register URL for link resolution
			if (page.canvasPageId) {
				const url = `${this.apiClientWrite['_baseUrl']}/courses/${this.courseId}/pages/${page.canvasPageId}`;
				this.linkResolver.register('page', page.title, url);
			}
		}
	}

	/**
	 * Upload an assignment
	 */
	private async uploadAssignment(
		assignment: ParsedAssignment,
		moduleId: number,
		canvasData: Map<string, any>,
		stats: UploadStats,
		itemsNeedingLinks: Array<{ type: string; id: number | string; content: string }>
	): Promise<void> {
		const canvasAssignment = assignment.canvasAssignmentId
			? canvasData.get(`assignment_${assignment.canvasAssignmentId}`) as CanvasAssignment | undefined
			: undefined;

		const comparison = compareAssignment(assignment, canvasAssignment);

		if (comparison.action === 'create') {
			const created = await this.apiClientWrite.createAssignment({
				name: assignment.title,
				description: markdownToSimpleHtml(assignment.description),
				points_possible: assignment.pointsPossible,
				due_at: assignment.dueAt,
				grading_type: assignment.gradingType,
				submission_types: assignment.submissionTypes,
				published: true
			});
			stats.itemsCreated++;

			// Register URL for link resolution
			const url = `${this.apiClientWrite['_baseUrl']}/courses/${this.courseId}/assignments/${created.id}`;
			this.linkResolver.register('assignment', assignment.title, url);

			// Check if content needs link resolution
			if (this.linkResolver.hasInternalLinks(assignment.description)) {
				itemsNeedingLinks.push({ type: 'assignment', id: created.id, content: assignment.description });
			}

			// Add to module
			if (!assignment.canvasModuleItemId) {
				await this.apiClientWrite.createModuleItem(moduleId, {
					title: assignment.title,
					type: 'Assignment',
					content_id: created.id
				});
			}
		} else if (comparison.action === 'update') {
			await this.apiClientWrite.updateAssignment(assignment.canvasAssignmentId!, {
				name: assignment.title,
				description: markdownToSimpleHtml(assignment.description),
				points_possible: assignment.pointsPossible,
				due_at: assignment.dueAt,
				grading_type: assignment.gradingType
				// Note: Cannot update submission_types (Canvas limitation)
			});
			stats.itemsUpdated++;

			// Register URL for link resolution
			const url = `${this.apiClientWrite['_baseUrl']}/courses/${this.courseId}/assignments/${assignment.canvasAssignmentId}`;
			this.linkResolver.register('assignment', assignment.title, url);

			// Check if content needs link resolution
			if (this.linkResolver.hasInternalLinks(assignment.description)) {
				itemsNeedingLinks.push({ type: 'assignment', id: assignment.canvasAssignmentId!, content: assignment.description });
			}
		} else {
			stats.itemsSkipped++;

			// Still register URL for link resolution
			if (assignment.canvasAssignmentId) {
				const url = `${this.apiClientWrite['_baseUrl']}/courses/${this.courseId}/assignments/${assignment.canvasAssignmentId}`;
				this.linkResolver.register('assignment', assignment.title, url);
			}
		}
	}

	/**
	 * Upload a discussion
	 */
	private async uploadDiscussion(
		discussion: ParsedDiscussion,
		moduleId: number,
		canvasData: Map<string, any>,
		stats: UploadStats,
		itemsNeedingLinks: Array<{ type: string; id: number | string; content: string }>
	): Promise<void> {
		const canvasDiscussion = discussion.canvasDiscussionId
			? canvasData.get(`discussion_${discussion.canvasDiscussionId}`) as CanvasDiscussion | undefined
			: undefined;

		const comparison = compareDiscussion(discussion, canvasDiscussion);

		if (comparison.action === 'create') {
			const params: any = {
				title: discussion.title,
				message: markdownToSimpleHtml(discussion.message),
				discussion_type: discussion.threaded ? 'threaded' : 'side_comment',
				require_initial_post: discussion.requireInitialPost,
				published: true
			};

			if (discussion.graded && discussion.pointsPossible !== undefined) {
				params.assignment = {
					points_possible: discussion.pointsPossible,
					due_at: discussion.dueAt
				};
			}

			const created = await this.apiClientWrite.createDiscussion(params);
			stats.itemsCreated++;

			// Register URL for link resolution
			const url = `${this.apiClientWrite['_baseUrl']}/courses/${this.courseId}/discussion_topics/${created.id}`;
			this.linkResolver.register('discussion', discussion.title, url);

			// Check if content needs link resolution
			if (this.linkResolver.hasInternalLinks(discussion.message)) {
				itemsNeedingLinks.push({ type: 'discussion', id: created.id, content: discussion.message });
			}

			// Add to module
			if (!discussion.canvasModuleItemId) {
				await this.apiClientWrite.createModuleItem(moduleId, {
					title: discussion.title,
					type: 'Discussion',
					content_id: created.id
				});
			}
		} else if (comparison.action === 'update') {
			const params: any = {
				title: discussion.title,
				message: markdownToSimpleHtml(discussion.message),
				discussion_type: discussion.threaded ? 'threaded' : 'side_comment',
				require_initial_post: discussion.requireInitialPost
			};

			if (discussion.graded && discussion.pointsPossible !== undefined) {
				params.assignment = {
					points_possible: discussion.pointsPossible,
					due_at: discussion.dueAt
				};
			}

			await this.apiClientWrite.updateDiscussion(discussion.canvasDiscussionId!, params);
			stats.itemsUpdated++;

			// Register URL for link resolution
			const url = `${this.apiClientWrite['_baseUrl']}/courses/${this.courseId}/discussion_topics/${discussion.canvasDiscussionId}`;
			this.linkResolver.register('discussion', discussion.title, url);

			// Check if content needs link resolution
			if (this.linkResolver.hasInternalLinks(discussion.message)) {
				itemsNeedingLinks.push({ type: 'discussion', id: discussion.canvasDiscussionId!, content: discussion.message });
			}
		} else {
			stats.itemsSkipped++;

			// Still register URL for link resolution
			if (discussion.canvasDiscussionId) {
				const url = `${this.apiClientWrite['_baseUrl']}/courses/${this.courseId}/discussion_topics/${discussion.canvasDiscussionId}`;
				this.linkResolver.register('discussion', discussion.title, url);
			}
		}
	}

	/**
	 * Upload a header (SubHeader)
	 */
	private async uploadHeader(header: ParsedHeader, moduleId: number, stats: UploadStats): Promise<void> {
		if (!header.canvasModuleItemId) {
			await this.apiClientWrite.createModuleItem(moduleId, {
				title: header.title,
				type: 'SubHeader'
			});
			stats.itemsCreated++;
		} else {
			stats.itemsSkipped++;
		}
	}

	/**
	 * Upload a link (ExternalUrl)
	 */
	private async uploadLink(link: ParsedLink, moduleId: number, stats: UploadStats): Promise<void> {
		if (!link.canvasModuleItemId) {
			await this.apiClientWrite.createModuleItem(moduleId, {
				title: link.title,
				type: 'ExternalUrl',
				external_url: link.url
			});
			stats.itemsCreated++;
		} else {
			stats.itemsSkipped++;
		}
	}

	/**
	 * Phase 2: Resolve internal links
	 */
	private async resolveLinks(
		items: Array<{ type: string; id: number | string; content: string }>,
		stats: UploadStats
	): Promise<void> {
		for (const item of items) {
			try {
				const { resolved, hasLinks } = this.linkResolver.resolve(item.content);

				if (hasLinks) {
					// Update content with resolved links
					if (item.type === 'page') {
						await this.apiClientWrite.updatePage(item.id as string, { body: resolved });
					} else if (item.type === 'assignment') {
						await this.apiClientWrite.updateAssignment(item.id as number, { description: resolved });
					} else if (item.type === 'discussion') {
						await this.apiClientWrite.updateDiscussion(item.id as number, { message: resolved });
					}
				}
			} catch (error: any) {
				stats.errors.push({
					itemType: item.type,
					itemTitle: `Link resolution for ${item.type} ${item.id}`,
					error: error.message || String(error)
				});
			}
		}
	}

	/**
	 * Phase 3: Update module positions (placeholder)
	 */
	private async updateModulePositions(modules: ParsedModule[], stats: UploadStats): Promise<void> {
		// This would update module item positions if needed
		// For now, items are added in order, so positions should be correct
		// Future enhancement: reorder items if positions change
	}
}
