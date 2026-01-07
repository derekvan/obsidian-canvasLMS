/**
 * Editor utility functions for cursor manipulation
 */

import { Editor } from 'obsidian';

/**
 * Insert text at cursor position and move cursor to end of inserted text
 */
export function insertAtCursor(editor: Editor, text: string): void {
	const cursor = editor.getCursor();
	editor.replaceRange(text, cursor);

	// Calculate new cursor position (end of inserted text)
	const lines = text.split('\n');
	const newLine = cursor.line + lines.length - 1;
	const newCh = lines.length === 1
		? cursor.ch + text.length
		: lines[lines.length - 1].length;

	editor.setCursor({ line: newLine, ch: newCh });
}

/**
 * Insert text at cursor with cursor placeholder positioning
 * Places cursor after textBefore, allowing user to immediately type content
 */
export function insertWithCursorPlaceholder(
	editor: Editor,
	textBefore: string,
	textAfter: string = ''
): void {
	const cursor = editor.getCursor();
	const fullText = textBefore + textAfter;
	editor.replaceRange(fullText, cursor);

	// Calculate cursor position (after textBefore)
	const lines = textBefore.split('\n');
	const newLine = cursor.line + lines.length - 1;
	const newCh = lines.length === 1
		? cursor.ch + textBefore.length
		: lines[lines.length - 1].length;

	editor.setCursor({ line: newLine, ch: newCh });
}
