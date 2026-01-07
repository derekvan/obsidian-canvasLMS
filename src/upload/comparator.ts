import { compareHtmlContent, markdownToSimpleHtml, normalizeHtml } from '../canvas/html-normalizer';
import type {
	ParsedModule,
	ParsedPage,
	ParsedAssignment,
	ParsedDiscussion,
	ChangeDetection
} from './types';
import type {
	CanvasModule,
	CanvasPage,
	CanvasAssignment,
	CanvasDiscussion
} from '../canvas/types';

/**
 * Compare parsed markdown content with Canvas data to detect changes
 */

let debugMode = false;
export function setComparatorDebug(enabled: boolean): void {
	debugMode = enabled;
}

function log(...args: any[]): void {
	if (debugMode) {
		console.log('[Comparator]', ...args);
	}
}

/**
 * Compare module
 */
export function compareModule(
	parsed: ParsedModule,
	canvas: CanvasModule | undefined
): ChangeDetection {
	// No Canvas data = CREATE
	if (!canvas) {
		return {
			hasChanges: true,
			changedFields: [],
			action: 'create'
		};
	}

	const changedFields: string[] = [];

	// Compare title
	if (parsed.title !== canvas.name) {
		changedFields.push('title');
	}

	if (changedFields.length > 0) {
		return {
			hasChanges: true,
			changedFields,
			action: 'update'
		};
	}

	return {
		hasChanges: false,
		changedFields: [],
		action: 'skip'
	};
}

/**
 * Compare page
 */
export function comparePage(
	parsed: ParsedPage,
	canvas: CanvasPage | undefined
): ChangeDetection {
	log(`      Comparing page: "${parsed.title}"`);

	// No Canvas data = CREATE
	if (!canvas) {
		log(`      No Canvas data found - marking as CREATE`);
		return {
			hasChanges: true,
			changedFields: [],
			action: 'create'
		};
	}

	const changedFields: string[] = [];

	// Compare title
	if (parsed.title !== canvas.title) {
		log(`      Title changed: "${parsed.title}" !== "${canvas.title}"`);
		changedFields.push('title');
	}

	// Compare body (normalize HTML for comparison)
	// Note: Canvas might return markdown OR HTML, so we convert both
	const parsedBodyHtml = markdownToSimpleHtml(parsed.body);
	const canvasBodyHtml = markdownToSimpleHtml(canvas.body);
	const match = compareHtmlContent(parsedBodyHtml, canvasBodyHtml);
	if (!match) {
		log(`      Body changed (normalized comparison failed)`);
		log(`      Parsed (normalized): "${normalizeHtml(parsedBodyHtml).substring(0, 100)}..."`);
		log(`      Canvas (normalized): "${normalizeHtml(canvasBodyHtml).substring(0, 100)}..."`);
		changedFields.push('body');
	} else {
		log(`      Body unchanged (normalized comparison passed)`);
	}

	if (changedFields.length > 0) {
		log(`      Result: UPDATE - Changed fields: [${changedFields.join(', ')}]`);
		return {
			hasChanges: true,
			changedFields,
			action: 'update'
		};
	}

	log(`      Result: SKIP - No changes detected`);
	return {
		hasChanges: false,
		changedFields: [],
		action: 'skip'
	};
}

/**
 * Compare assignment
 */
export function compareAssignment(
	parsed: ParsedAssignment,
	canvas: CanvasAssignment | undefined
): ChangeDetection {
	// No Canvas data = CREATE
	if (!canvas) {
		return {
			hasChanges: true,
			changedFields: [],
			action: 'create'
		};
	}

	const changedFields: string[] = [];

	// Compare title
	if (parsed.title !== canvas.name) {
		changedFields.push('title');
	}

	// Compare description (normalize HTML)
	// Note: Canvas might return markdown OR HTML, so we convert both
	const parsedDescHtml = markdownToSimpleHtml(parsed.description);
	const canvasDescHtml = markdownToSimpleHtml(canvas.description);
	if (!compareHtmlContent(parsedDescHtml, canvasDescHtml)) {
		changedFields.push('description');
	}

	// Compare points (treat null and undefined as equivalent)
	const parsedPoints = parsed.pointsPossible ?? null;
	const canvasPoints = canvas.points_possible ?? null;
	if (parsedPoints !== canvasPoints) {
		changedFields.push('points_possible');
	}

	// Compare due date (normalize to compare)
	const parsedDue = parsed.dueAt ? new Date(parsed.dueAt).toISOString() : null;
	const canvasDue = canvas.due_at ? new Date(canvas.due_at).toISOString() : null;
	if (parsedDue !== canvasDue) {
		changedFields.push('due_at');
	}

	// Compare grading type
	if (parsed.gradingType && parsed.gradingType !== canvas.grading_type) {
		changedFields.push('grading_type');
	}

	// Note: Cannot compare submission_types (Canvas limitation - cannot update)
	// We'll skip this comparison to avoid false positives

	if (changedFields.length > 0) {
		return {
			hasChanges: true,
			changedFields,
			action: 'update'
		};
	}

	return {
		hasChanges: false,
		changedFields: [],
		action: 'skip'
	};
}

/**
 * Compare discussion
 */
export function compareDiscussion(
	parsed: ParsedDiscussion,
	canvas: CanvasDiscussion | undefined
): ChangeDetection {
	log(`      Comparing discussion: "${parsed.title}"`);

	// No Canvas data = CREATE
	if (!canvas) {
		log(`      No Canvas data found - marking as CREATE`);
		return {
			hasChanges: true,
			changedFields: [],
			action: 'create'
		};
	}

	const changedFields: string[] = [];

	// Compare title
	if (parsed.title !== canvas.title) {
		log(`      Title changed: "${parsed.title}" !== "${canvas.title}"`);
		changedFields.push('title');
	}

	// Compare message (normalize HTML)
	// Note: Canvas might return markdown OR HTML, so we convert both
	const parsedMsgHtml = markdownToSimpleHtml(parsed.message);
	const canvasMsgHtml = markdownToSimpleHtml(canvas.message);
	const match = compareHtmlContent(parsedMsgHtml, canvasMsgHtml);
	if (!match) {
		log(`      Message changed (normalized comparison failed)`);
		log(`      Parsed (normalized): "${normalizeHtml(parsedMsgHtml).substring(0, 100)}..."`);
		log(`      Canvas (normalized): "${normalizeHtml(canvasMsgHtml).substring(0, 100)}..."`);
		changedFields.push('message');
	}

	// Compare require_initial_post
	if (parsed.requireInitialPost !== canvas.require_initial_post) {
		log(`      require_initial_post changed: ${parsed.requireInitialPost} !== ${canvas.require_initial_post}`);
		changedFields.push('require_initial_post');
	}

	// Compare threaded
	const canvasThreaded = canvas.discussion_type === 'threaded';
	if (parsed.threaded !== canvasThreaded) {
		log(`      threaded changed: ${parsed.threaded} !== ${canvasThreaded}`);
		changedFields.push('threaded');
	}

	// Compare graded status
	const canvasGraded = canvas.assignment !== undefined;
	if (parsed.graded !== canvasGraded) {
		log(`      graded changed: ${parsed.graded} !== ${canvasGraded}`);
		changedFields.push('graded');
	}

	// If graded, compare points and due date
	if (parsed.graded && canvas.assignment) {
		if (parsed.pointsPossible !== canvas.assignment.points_possible) {
			log(`      points changed: ${parsed.pointsPossible} !== ${canvas.assignment.points_possible}`);
			changedFields.push('points');
		}

		const parsedDue = parsed.dueAt ? new Date(parsed.dueAt).toISOString() : null;
		const canvasDue = canvas.assignment.due_at ? new Date(canvas.assignment.due_at).toISOString() : null;
		if (parsedDue !== canvasDue) {
			log(`      due_at changed: ${parsedDue} !== ${canvasDue}`);
			changedFields.push('due_at');
		}
	}

	if (changedFields.length > 0) {
		log(`      Result: UPDATE - Changed fields: [${changedFields.join(', ')}]`);
		return {
			hasChanges: true,
			changedFields,
			action: 'update'
		};
	}

	log(`      Result: SKIP - No changes detected`);
	return {
		hasChanges: false,
		changedFields: [],
		action: 'skip'
	};
}
