# Canvas LMS Helper

> **⚠️ Active Development Warning**
> This plugin is currently in active development and may not work perfectly in all cases. While the core functionality is stable, you may encounter edge cases or unexpected behavior. Please report any issues on GitHub, and always keep backups of your Canvas content.

An Obsidian plugin for syncing course content with Canvas LMS. Download courses as markdown, edit them in Obsidian, and upload changes back to Canvas.

## Features

- **Download courses**: Fetch your Canvas course structure (modules, pages, assignments, discussions) as a single markdown file
- **Re-download**: Smart detection of existing Canvas files - automatically re-downloads when you run the download command with a Canvas file open
- **Edit in Obsidian**: Work with your course content using Obsidian's powerful editing features
- **Upload changes**: Push your edits back to Canvas with a preview of what will change
- **Smart comparison**: Only updates content that has actually changed
- **Template insertion**: Quickly add new modules, pages, assignments, and discussions

## Requirements

 ### Module Organization

 This plugin works best with content organized in Canvas modules. The download process:

 1. Fetches all modules in the course
 2. Fetches items within each module
 3. Downloads the content for each item
 4. **NEW**: Fetches ALL course files (including those not in modules) and adds them to a "Course Files" section

 **Note**: Pages, assignments, and discussions that exist in Canvas but are not added to any module will not be downloaded. However, **files** uploaded to Canvas are now downloaded regardless of whether they're in modules, allowing you to link to any file using `[[File:filename.pdf]]` syntax.


## Installation

> **Note**: This plugin is not yet available in the Obsidian Community Plugins directory. Use BRAT or manual installation for now.

### Using BRAT (Recommended)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Community Plugins
2. Open BRAT settings and click "Add Beta plugin"
3. Enter: `derekvan/obsidian-canvasLMS`
4. Click "Add Plugin" and enable it in Community Plugins

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/derekvan/obsidian-canvasLMS/releases)
2. Create folder `<vault>/.obsidian/plugins/canvaslms-helper/`
3. Copy the downloaded files into that folder
4. Reload Obsidian and enable the plugin in Settings > Community Plugins

## Setup

1. Open Settings > Canvas LMS Helper
2. Enter your Canvas URL (e.g., `https://yourschool.instructure.com`)
3. Enter your Canvas API token (generate one from Canvas Account > Settings > New Access Token)

## Usage

### Downloading a Course

1. Run the command `Canvas LMS Helper: Download course`
2. Enter your course ID (found in the Canvas URL: `/courses/12345`)
3. Choose where to save the file
4. The course will be downloaded as a markdown file

### Re-downloading a Course

After you've uploaded changes to Canvas, you can re-download the course to get fresh data (including new workflow IDs):

1. Open the Canvas course markdown file in Obsidian
2. Run the command `Canvas LMS Helper: Download course`
3. The plugin automatically detects the course ID from the file's frontmatter
4. You'll see a confirmation dialog showing the course name
5. Click "Re-download" to replace the file with fresh data from Canvas

This is useful for:
- Getting updated workflow IDs after uploading new content
- Syncing changes made on Canvas web interface back to your markdown file
- Refreshing course data without having to enter the course ID again

### Editing Course Content

The downloaded file uses a specific format:

```markdown
---
canvas_course_id: 12345
canvas_url: https://yourschool.instructure.com/courses/12345
---

# Module Name
<!-- canvas_module_id: 111 -->

## [page] Page Title
<!-- canvas_page_id: page-slug -->
<!-- canvas_module_item_id: 222 -->
Page content here...

You can link to files using: [[File:document.pdf]] or [[File:My Document Name]]

## [assignment] Assignment Title
<!-- canvas_assignment_id: 333 -->
<!-- canvas_module_item_id: 444 -->
points: 100
due: 2024-12-31 11:59pm
grade_display: points
submission_types: online_upload, online_text_entry

---
Assignment description here...

---

# Course Files

<!-- Files uploaded to Canvas but not added to any module -->

## [file] Document Name
<!-- canvas_file_id: 555 -->
filename: document.pdf

## [file] Another File
<!-- canvas_file_id: 666 -->
filename: another-file.pdf
```

### Uploading Changes

1. Open your course markdown file
2. Run the command `Canvas LMS Helper: Upload to Canvas`
3. Review the preview showing what will be created, updated, or skipped
4. Click "Upload" to apply changes

### Adding Content

Use these commands to insert new content templates:

- `Canvas LMS Helper: Add Canvas content` - Opens a picker to choose content type
- `Canvas LMS Helper: Insert Canvas module` - Add a new module
- `Canvas LMS Helper: Insert Canvas page` - Add a new page
- `Canvas LMS Helper: Insert Canvas assignment` - Add a new assignment
- `Canvas LMS Helper: Insert Canvas discussion` - Add a new discussion
- `Canvas LMS Helper: Insert Canvas header` - Add a section header
- `Canvas LMS Helper: Insert Canvas link` - Add an external link
- `Canvas LMS Helper: Insert Canvas file` - Add a file reference

### Linking to Files

You can link to any file uploaded to Canvas using the `[[File:...]]` syntax:

- `[[File:document.pdf]]` - Links using the filename
- `[[File:My Document Title]]` - Links using the display name

During upload, these links are automatically converted to proper Canvas file preview links. Files can be referenced whether they're in modules or not - the download process fetches all course files and adds them to the markdown.

## Supported Content Types

| Type | Download | Upload | Link Resolution | Notes |
|------|----------|--------|----------------|-------|
| Modules | Yes | Yes | N/A | Full support |
| Pages | Yes | Yes | Yes | Full support with `[[page:Title]]` syntax |
| Assignments | Yes | Yes | Yes | Full support with `[[assignment:Title]]` syntax |
| Discussions | Yes | Yes | Yes | Full support with `[[discussion:Title]]` syntax |
| Headers | Yes | Yes | N/A | SubHeader items |
| External Links | Yes | Create only | N/A | Cannot update URLs |
| Files | Yes | No | Yes | Download all files; link with `[[File:name]]` syntax; files cannot be uploaded via API |

## Limitations

- **File uploads are not supported** - Files must be uploaded to Canvas manually through the web interface. However, you can link to any uploaded file using `[[File:...]]` syntax, and those links will be resolved during upload.
- **External link URLs cannot be updated** after creation
- **Pages, assignments, and discussions not in modules** are not downloaded (only files are fetched regardless of module placement)
- **Some Canvas features are not supported** - quizzes, rubrics, grading schemes, etc.
- **To avoid conflicts**, if you change something on the Canvas web page (like editing a page during class), re-download the markdown file before editing again to prevent conflicts from having changes on both sides.

## Security

Your Canvas API token is stored locally in Obsidian's plugin data and is only sent to your Canvas instance. Never share your API token.

## Support

If you encounter issues or have feature requests, please open an issue on the GitHub repository.

## License

MIT License - See LICENSE file for details.
