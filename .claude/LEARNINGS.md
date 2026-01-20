# Canvas LMS Helper - Development Learnings

This document tracks friction points, root causes, and fixes discovered during development.

## 2026-01-19: File Links Not Resolving on First Upload

### Problem
When creating a new page with `[[File:name of file.pdf]]` links, the links don't resolve on the first upload (they appear as plain text). They only work after downloading the course again and re-uploading.

### Root Cause
The upload workflow in `src/upload/uploader.ts` only registered files in the `LinkResolver` if they had a `canvasFileId` parsed from the markdown. Files were only fetched in `fetchCanvasData()` for files explicitly listed as `## [file]` items in the markdown.

When a user manually adds `[[File:name.pdf]]` to page content, that file might exist in Canvas but not be listed in the markdown as a `## [file]` item, so it wouldn't be registered for link resolution.

### Solution
Pre-fetch ALL files from the Canvas course and register them in the `LinkResolver` before processing modules. This ensures any `[[File:name.pdf]]` link can resolve regardless of whether the file is explicitly listed in the markdown.

**Implementation:**
- Added `registerAllCourseFiles()` method that fetches all folders and files from Canvas
- Called this method in both `upload()` and `generatePreview()` after clearing the link resolver
- Files are now registered by both `display_name` and `filename` for maximum compatibility

**Files Modified:**
- `src/upload/uploader.ts`: Added `registerAllCourseFiles()` method and integrated it into upload and preview workflows

### Key Insight
Link resolution should be comprehensive and proactive, not dependent on what's explicitly listed in the markdown. All available Canvas resources should be registered for resolution.
