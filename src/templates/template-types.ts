/**
 * TypeScript interfaces for Canvas template data
 */

export interface ModuleData {
	title: string;
}

export interface HeaderData {
	title: string;
}

export interface PageData {
	title: string;
}

export interface LinkData {
	title: string;
	url: string;
}

export interface FileData {
	title: string;
	filename: string;
}

export interface AssignmentData {
	title: string;
	points?: number;
	dueDate?: string;
	dueTime?: string;
	gradeDisplay?: 'complete_incomplete' | 'points' | 'not_graded';
	submissionTypes?: string;
}

export interface DiscussionData {
	title: string;
	requireInitialPost?: boolean;
	threaded?: boolean;
	graded?: boolean;
	points?: number;
	dueDate?: string;
	dueTime?: string;
	gradeDisplay?: 'complete_incomplete' | 'points' | 'not_graded';
}

export interface InternalLinkData {
	type: 'Page' | 'Assignment' | 'Discussion' | 'File';
	name: string;
}

export type ContentType =
	| 'module'
	| 'header'
	| 'page'
	| 'link'
	| 'file'
	| 'assignment'
	| 'discussion'
	| 'internal-link';
