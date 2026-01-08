# Canvas LMS Helper

An Obsidian plugin for syncing course content with Canvas LMS. Download courses as markdown, edit them in Obsidian, and upload changes back to Canvas.

## Features

- **Download courses**: Fetch your Canvas course structure (modules, pages, assignments, discussions) as a single markdown file
- **Edit in Obsidian**: Work with your course content using Obsidian's powerful editing features
- **Upload changes**: Push your edits back to Canvas with a preview of what will change
- **Smart comparison**: Only updates content that has actually changed
- **Template insertion**: Quickly add new modules, pages, assignments, and discussions

## Requirements

 ### Module Organization

 This plugin requires all course content to be organized in Canvas modules. The download process works by:

 1. Fetching all modules in the course
 2. Fetching items within each module
 3. Downloading the content for each item

 **Important**: Content that exists in Canvas but is not added to any module will not be downloaded or synced. This
 includes:
 - Pages not added to modules
 - Assignments not added to modules
 - Discussions not added to modules


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

## [assignment] Assignment Title
<!-- canvas_assignment_id: 333 -->
<!-- canvas_module_item_id: 444 -->
points: 100
due: 2024-12-31 11:59pm
grade_display: points
submission_types: online_upload, online_text_entry

---
Assignment description here...
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

## Supported Content Types

| Type | Download | Upload | Notes |
|------|----------|--------|-------|
| Modules | Yes | Yes | Full support |
| Pages | Yes | Yes | Full support |
| Assignments | Yes | Yes | Full support |
| Discussions | Yes | Yes | Full support |
| Headers | Yes | Yes | SubHeader items |
| External Links | Yes | Create only | Cannot update URLs |
| Files | Yes | No | Download only |

## Limitations

- File uploads are not supported (files are downloaded as references only)
- External link URLs cannot be updated after creation
- Some Canvas features (quizzes, rubrics, etc.) are not supported
- To avoid conflicts, if you change something on the Canvas web page (like, you edit a page during class), you should re-download the markdown file before editing again so that you don't end up with conflicts from having changes on both sides (on the web and on the local markdown file).

## Security

Your Canvas API token is stored locally in Obsidian's plugin data and is only sent to your Canvas instance. Never share your API token.

## Support

If you encounter issues or have feature requests, please open an issue on the GitHub repository.

## License

MIT License - See LICENSE file for details.
