# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server with HMR
npm run dev

# Build for production (runs TypeScript check + Vite build)
npm run build

# Lint the codebase
npm run lint

# Preview production build
npm run preview
```

## Project Overview

This is a browser-based live code editor built with React, TypeScript, and Vite. It provides an in-memory file system with Monaco Editor integration, live markdown preview, and global search capabilities. All data persists to localStorage.

## Architecture

### State Management (Redux Toolkit)

The application uses a single Redux store ([src/app/store.ts](src/app/store.ts)) with one slice:

- **fsSlice** ([src/features/fs/fsSlice.ts](src/features/fs/fsSlice.ts)): Manages the entire file system state
  - `root`: The file tree (recursive `FolderNode` containing `FileNode` and child folders)
  - `activeFileId`: Currently selected file
  - `openFileIds`: Tab bar (ordered list of open file IDs)
  - Search state: `searchQuery`, `searchMode`, `matchCase`, `extFilters`

Every state mutation triggers the `persistMiddleware` which saves to localStorage via [src/features/fs/fsPersistence.ts](src/features/fs/fsPersistence.ts).

### File System Model

Defined in [src/types/fs.ts](src/types/fs.ts):

- **FileNode**: Has `id`, `name`, `extension`, `content`, `type: 'file'`
- **FolderNode**: Has `id`, `name`, `children[]`, `type: 'folder'`
- The tree is navigated recursively via helper functions like `findNode()`, `findParentFolder()` in fsSlice

All nodes have unique IDs (generated via `genId()` using crypto.randomUUID or fallback).

### Key Features

1. **Editor Panel** ([src/features/editor/EditorPanel.tsx](src/features/editor/EditorPanel.tsx))
   - Monaco Editor with syntax highlighting
   - Split-pane markdown preview for `.md` files
   - Snippet system with tab-stop navigation (custom implementation using Monaco decorations)
   - Template toolbar buttons for common patterns (defined in [src/features/templates/toolbarTemplates.ts](src/features/templates/toolbarTemplates.ts))

2. **File Tree** ([src/features/fs/FileTree.tsx](src/features/fs/FileTree.tsx) and [FileTreeNode.tsx](src/features/fs/FileTreeNode.tsx))
   - Hierarchical display with expand/collapse
   - Context menu for create/rename/delete operations
   - Inline rename (custom hook: [useInlineRename.ts](src/features/fs/useInlineRename.ts))

3. **Global Search** ([src/features/search/GlobalSearchPanel.tsx](src/features/search/GlobalSearchPanel.tsx))
   - Search modes: all, names only, content only
   - Case-sensitive toggle
   - Extension filters (multi-select)
   - Results computed via selector ([fsSelectors.ts](src/features/fs/fsSelectors.ts)) with line/column positions
   - Click results to open file and reveal location

4. **Tab System**
   - Files can be opened in tabs (managed via `openFileIds` array)
   - Closing active tab switches to neighbor tab
   - `setActiveFile` ensures file is in tab bar

5. **Export**
   - Download entire file tree as ZIP ([src/features/fs/exportZip.ts](src/features/fs/exportZip.ts)) using JSZip

### Snippet Engine

[src/features/templates/snippetEngine.ts](src/features/templates/snippetEngine.ts) parses VSCode-style placeholders:

- `${1:default}`, `${2:text}`, etc.
- Tab/Shift+Tab to navigate
- Escape to exit snippet mode
- Monaco decorations with custom CSS class `.snippet-ph`

### Editor Integration Patterns

The editor uses module-level variables (`__focusEditor`, `__revealInEditor`, `__pendingReveal`) to bridge imperative actions (e.g., from search results) to the React component lifecycle. When opening a file from search:

1. Dispatch `openFile` to update Redux state
2. React re-renders with new active file
3. `useEffect` in EditorPanel checks for pending reveal and executes after Monaco updates

## Code Patterns

- **File operations**: All CRUD goes through Redux actions (`createFile`, `renameNode`, `deleteNode`, etc.)
- **Selectors**: Use memoized selectors from [fsSelectors.ts](src/features/fs/fsSelectors.ts) for derived data (search results, active file lookup, etc.)
- **Extension mapping**: `langFromExt()` in EditorPanel converts file extension to Monaco language ID
- **Filename parsing**: `parseFileName()` in fsSlice handles edge cases like `.env` (dotfiles) and multi-dot extensions

## Styling

- Tailwind CSS with dark theme preset
- Typography plugin for markdown rendering
- PostCSS with Autoprefixer
