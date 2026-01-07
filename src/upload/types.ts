// Upload-specific type definitions

/**
 * Parsed markdown structures
 */

export interface ParsedModule {
	title: string;
	canvasModuleId?: number;
	items: ParsedModuleItem[];
}

export type ParsedModuleItem =
	| ParsedPage
	| ParsedAssignment
	| ParsedDiscussion
	| ParsedHeader
	| ParsedLink
	| ParsedFile;

export interface ParsedItemBase {
	type: 'page' | 'assignment' | 'discussion' | 'header' | 'link' | 'file';
	title: string;
	canvasModuleItemId?: number;
}

export interface ParsedPage extends ParsedItemBase {
	type: 'page';
	canvasPageId?: string; // URL slug
	body: string;
}

export interface ParsedAssignment extends ParsedItemBase {
	type: 'assignment';
	canvasAssignmentId?: number;
	description: string;
	pointsPossible?: number;
	dueAt?: string; // ISO 8601 format
	gradingType?: string;
	submissionTypes?: string[];
}

export interface ParsedDiscussion extends ParsedItemBase {
	type: 'discussion';
	canvasDiscussionId?: number;
	message: string;
	requireInitialPost: boolean | null;
	threaded: boolean;
	graded: boolean;
	pointsPossible?: number;
	dueAt?: string; // ISO 8601 format
}

export interface ParsedHeader extends ParsedItemBase {
	type: 'header';
}

export interface ParsedLink extends ParsedItemBase {
	type: 'link';
	url: string;
}

export interface ParsedFile extends ParsedItemBase {
	type: 'file';
	canvasFileId?: number;
	filename?: string;
}

/**
 * Change detection
 */

export interface ChangeDetection {
	hasChanges: boolean;
	changedFields: string[];
	action: 'create' | 'update' | 'skip';
}

/**
 * Upload preview
 */

export interface PreviewItem {
	moduleTitle: string;
	modulAction?: 'create' | 'update' | 'skip';
	moduleChangedFields?: string[];
	items: PreviewItemDetail[];
}

export interface PreviewItemDetail {
	type: string;
	title: string;
	action: 'create' | 'update' | 'skip';
	changedFields?: string[];
	metadata?: Record<string, any>;
}

/**
 * Upload statistics
 */

export interface UploadStats {
	itemsCreated: number;
	itemsUpdated: number;
	itemsSkipped: number;
	errors: UploadError[];
}

export interface UploadError {
	itemType: string;
	itemTitle: string;
	error: string;
}

/**
 * API request parameters
 */

export interface CreateModuleParams {
	name: string;
	position?: number;
}

export interface UpdateModuleParams {
	name?: string;
	position?: number;
}

export interface CreatePageParams {
	title: string;
	body: string;
	published?: boolean;
}

export interface UpdatePageParams {
	title?: string;
	body?: string;
	published?: boolean;
}

export interface CreateAssignmentParams {
	name: string;
	description: string;
	points_possible?: number;
	due_at?: string; // ISO 8601
	grading_type?: string;
	submission_types?: string[];
	published?: boolean;
}

export interface UpdateAssignmentParams {
	name?: string;
	description?: string;
	points_possible?: number;
	due_at?: string; // ISO 8601
	grading_type?: string;
	published?: boolean;
	// Note: Cannot update submission_types on existing assignments (Canvas limitation)
}

export interface CreateDiscussionParams {
	title: string;
	message: string;
	discussion_type?: 'threaded' | 'side_comment';
	require_initial_post?: boolean;
	published?: boolean;
	assignment?: {
		points_possible: number;
		due_at?: string; // ISO 8601
	};
}

export interface UpdateDiscussionParams {
	title?: string;
	message?: string;
	discussion_type?: 'threaded' | 'side_comment';
	require_initial_post?: boolean;
	published?: boolean;
	assignment?: {
		points_possible?: number;
		due_at?: string; // ISO 8601
	};
}

export interface CreateModuleItemParams {
	title: string;
	type: string;
	content_id?: number;
	page_url?: string;
	external_url?: string;
	position?: number;
	indent?: number;
}

export interface UpdateModuleItemParams {
	title?: string;
	position?: number;
	indent?: number;
}

/**
 * Frontmatter
 */

export interface CourseFrontmatter {
	canvas_course_id: string;
	canvas_url: string;
}
