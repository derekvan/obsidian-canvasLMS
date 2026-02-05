# BRAT Release Workflow

This document outlines the steps to prepare a release for BRAT (Beta Reviewers Auto-update Tester).

## Prerequisites

- Code changes committed and pushed to main branch
- Version number decided (e.g., 0.2.3)

## Steps

### 1. Update manifest.json

Ensure `manifest.json` includes the `version` field:

```json
{
	"id": "canvaslms-helper",
	"name": "Canvas LMS Helper",
	"version": "0.2.X",
	"minAppVersion": "0.15.0",
	"description": "Download a canvas course to a Markdown file, edit, then send it back to the LMS. Create modules, assignments, pages, links, discussions, etc.",
	"author": "Derek Van Ittersum",
	"authorUrl": "https://github.com/derekvan",
	"isDesktopOnly": false
}
```

### 2. Create GitHub Release

```bash
gh release create v0.2.X --title "v0.2.X" --notes "$(cat <<'NOTES'
## Features
- Feature description here

## Fixes
- Bug fix description here

## Documentation
- Doc update description here

🤖 Generated with [Claude Code](https://claude.com/claude-code)
NOTES
)"
```

### 3. Upload Required BRAT Files

BRAT requires these three files to be attached to the release:

```bash
gh release upload v0.2.X main.js manifest.json styles.css
```

If updating an existing release:

```bash
gh release upload v0.2.X manifest.json --clobber
```

### 4. Verify Release

```bash
gh release view v0.2.X
```

Check that all three assets are present:
- ✅ main.js
- ✅ manifest.json (with version field)
- ✅ styles.css

## BRAT Installation

Users can install via BRAT using:
- Repository: `derekvan/obsidian-canvasLMS`

## Common Issues

### "Missing manifest.json file"
- **Cause**: manifest.json missing `version` field
- **Fix**: Add `"version": "0.2.X"` to manifest.json and re-upload

### Files not in release
- **Cause**: Forgot to run `gh release upload`
- **Fix**: Upload files with the command in step 3

## Quick Command Summary

When you say "commit, push, and prepare for BRAT":

1. Update manifest.json version
2. Build the plugin if needed
3. Create release with notes based on recent commits
4. Upload main.js, manifest.json, styles.css
5. Verify with `gh release view`
