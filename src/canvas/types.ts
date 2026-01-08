// Canvas API response types

export interface CanvasCourse {
	id: number;
	name: string;
	course_code: string;
}

export interface CanvasModule {
	id: number;
	name: string;
	position: number;
	items_count: number;
	items_url: string;
}

export type CanvasModuleItemType = 'SubHeader' | 'Page' | 'ExternalUrl' | 'Assignment' | 'Discussion' | 'File';

export interface CanvasModuleItem {
	id: number;
	module_id: number;
	position: number;
	title: string;
	type: CanvasModuleItemType;
	indent: number;

	// Type-specific fields (nullable based on type)
	page_url?: string;           // For Page type
	external_url?: string;        // For ExternalUrl type
	content_id?: number;          // For Assignment, Discussion, File types
	url?: string;                 // API URL for fetching details
}

export interface CanvasPage {
	page_id: number;
	url: string;
	title: string;
	body: string;                 // HTML content
	created_at: string;
	updated_at: string;
}

export interface CanvasAssignment {
	id: number;
	name: string;
	description: string;          // HTML content
	due_at: string | null;
	points_possible: number | null;
	grading_type: string;         // "pass_fail", "points", "not_graded", etc.
	submission_types: string[];   // ["online_text_entry", "online_upload", etc.]
	has_submitted_submissions: boolean;
}

export interface CanvasDiscussion {
	id: number;
	title: string;
	message: string;              // HTML content
	discussion_type: string;      // "threaded" or "side_comment"
	posted_at: string;
	require_initial_post: boolean;
	assignment?: {
		points_possible: number;
		due_at: string | null;
	};
}

export interface CanvasFile {
	id: number;
	uuid: string;
	display_name: string;
	filename: string;
	url: string;
	preview_url?: string;
	size: number;
	'content-type': string;
	created_at: string;
	updated_at: string;
}

export interface CanvasFolder {
	id: number;
	name: string;
	full_name: string;
	parent_folder_id: number | null;
	folders_url: string;
	files_url: string;
}
