# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

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

---

## Project Overview

**Live Editor** is a fully-featured, browser-based code editor with an in-memory file system. It provides Monaco Editor integration, live preview for HTML/Markdown, global search, syntax highlighting for 70+ languages, code formatting, snippet system, and persistent storage via localStorage.

**Tech Stack:**
- React 19.2 + TypeScript
- Redux Toolkit for state management
- Monaco Editor (VSCode's editor core)
- Vite for build tooling
- Tailwind CSS for styling
- JSZip for export functionality
- Prettier for code formatting
- React Markdown with GFM support

---

## Architecture

### State Management (Redux Toolkit)

The application uses a single Redux store ([src/app/store.ts](src/app/store.ts)) with two slices:

#### **fsSlice** ([src/features/fs/fsSlice.ts](src/features/fs/fsSlice.ts))
Manages the entire file system state:

```typescript
{
  root: FolderNode,           // File tree root (recursive structure)
  activeFileId: string | null,// Currently selected file
  openFileIds: string[],      // Tab bar (ordered list of open file IDs)
  pinnedFileIds: string[],    // Pinned tabs (can't be closed)
  hexViewEnabled: boolean,    // Global hex view toggle
  searchQuery: string,        // Search input
  searchMode: SearchMode,     // 'all' | 'names' | 'content'
  matchCase: boolean,         // Case-sensitive search
  extFilters: string[]        // Extension filters (e.g., ['md', 'ts'])
}
```

**Actions:**
- **File Operations:** `createFile`, `createFolder`, `renameNode`, `deleteNode`, `updateFileContent`
- **Tab Management:** `openFile`, `closeFile`, `setActiveFile`, `togglePinFile`
- **Search:** `setSearchQuery`, `setSearchMode`, `setMatchCase`, `setExtFilters`, `clearSearch`
- **View:** `toggleHexView`
- **Import:** `importFolder` (from computer)

Every state mutation triggers the `persistMiddleware` which saves to localStorage via [src/features/fs/fsPersistence.ts](src/features/fs/fsPersistence.ts) with 1-second debounce.

#### **themeSlice** ([src/features/theme/themeSlice.ts](src/features/theme/themeSlice.ts))
Manages theme state:

```typescript
{ theme: 'light' | 'dark' }
```

**Actions:**
- `setTheme(theme)`: Set theme and update localStorage + DOM class
- `toggleTheme()`: Toggle between light/dark

Saved separately to `localStorage['live-editor-theme']`.

---

### File System Model

Defined in [src/types/fs.ts](src/types/fs.ts):

```typescript
type FileNode = {
  id: string;
  name: string;          // Without extension
  extension: string;     // e.g., 'js', 'md', ''
  content: string;       // File contents (or base64 data URL for images)
  type: 'file';
}

type FolderNode = {
  id: string;
  name: string;
  children: FSNode[];    // Array of files and folders
  type: 'folder';
}

type FSNode = FileNode | FolderNode;
```

**Key Patterns:**
- All nodes have unique IDs generated via `genId()` (crypto.randomUUID or fallback)
- File names are stored separately from extensions
- Dotfiles (`.env`, `.gitignore`) have empty `name` and extension as the full name
- Multi-dot extensions (e.g., `foo.test.js`) use only the last part as extension (`js`)
- Tree navigation uses recursive helper functions: `findNode()`, `findParentFolder()`, `deleteNodeById()`

---

### Component Architecture

#### **App.tsx** - Main Application Layout
- **Purpose:** Root component with resizable sidebar layout
- **Features:**
  - Resizable sidebar (200-600px, default 280px)
  - Theme toggle button
  - Import folder button (with file picker modal)
  - Export ZIP button
  - Two-column layout: Sidebar + EditorPanel

#### **EditorPanel.tsx** ([src/features/editor/EditorPanel.tsx](src/features/editor/EditorPanel.tsx))
The main code editor component with Monaco integration.

**Features:**
- Monaco Editor with syntax highlighting (70+ languages)
- Split-pane markdown preview (for `.md` files)
- Split-pane HTML preview (for `.html`/`.htm` files with sandboxed iframe)
- Image viewer (for png, jpg, gif, svg, webp, bmp, ico)
- Hex viewer toggle (global state, affects all files)
- Snippet system with tab-stop navigation
- Template toolbar buttons (language-specific)
- Code formatting with Prettier (Shift+Alt+F)
- Focus/reveal bridge for search results
- Debounced HTML preview (300ms to reduce flashing)

**Keyboard Shortcuts:**
- **Tab:** Next snippet placeholder (when in snippet mode)
- **Shift+Tab:** Previous snippet placeholder
- **Escape:** Exit snippet mode
- **Shift+Alt+F:** Format code with Prettier

**Module-Level Bridges:**
```typescript
// For imperative actions from outside React (e.g., search results)
let __focusEditor: (() => void) | null = null;
let __revealInEditor: ((line: number, column: number) => void) | null = null;
let __pendingReveal: { fileId: string; line: number; column: number } | null = null;
```

When opening a file from search:
1. Dispatch `openFile` to update Redux state
2. Call `requestRevealForFile(fileId, line, column)`
3. React re-renders EditorPanel with new active file
4. `useEffect` detects pending reveal and executes after Monaco settles

#### **TabsBar.tsx** ([src/features/editor/TabsBar.tsx](src/features/editor/TabsBar.tsx))
File tab bar component.

**Features:**
- Display open files as tabs
- Pin/unpin tabs (pinned tabs can't be closed, sorted first)
- Close tabs with smart neighbor selection
- Context menu (right-click):
  - Close Others
  - Close to Right
  - Copy Path (absolute from root)
  - Copy Relative Path (from active file)
- File icons based on extension

#### **HexViewer.tsx** ([src/features/editor/HexViewer.tsx](src/features/editor/HexViewer.tsx))
Hexadecimal/Binary file viewer.

**Features:**
- Display modes: Hexadecimal or Binary
- Bytes per row: 8, 16, 24, or 32
- ASCII preview column
- Mouse selection (drag to select bytes)
- Hover highlighting
- File size display

#### **FileTree.tsx** & **FileTreeNode.tsx** ([src/features/fs/](src/features/fs/))
Hierarchical file system display.

**Features:**
- Expand/collapse folders (persistent state via localStorage)
- Create file/folder with inline editing
- Rename file/folder with inline editing and validation
- Delete file/folder with confirmation dialog
- Copy path (absolute/relative) via context menu
- Context menu (right-click)
- File/folder icons (emoji-based)
- Name conflict detection
- Recursive tree rendering

**Custom Hooks:**
- `useExpandedFolders()`: Manages folder expansion state
- `useInlineRename()`: Handles inline create/rename logic
- `useContextMenu()`: Context menu positioning and state

#### **GlobalSearchPanel.tsx** ([src/features/search/GlobalSearchPanel.tsx](src/features/search/GlobalSearchPanel.tsx))
Global file and content search interface.

**Features:**
- Search modes: All (names + content), Names only, Content only
- Case-sensitive toggle
- Extension filters (multi-select checkboxes)
- Real-time results with line/column positions
- Preview snippets for content matches (shows context around match)
- Click results to open file and reveal location
- Results computed via memoized selector for performance

**Search Algorithm:**
- Name search: Case-sensitive/insensitive string matching on file/folder names
- Content search: Line-by-line search with position tracking
- Extension filtering: Applies to all search modes
- Results include: file path, line number, column number, preview text

#### **PreviewPanel.tsx** ([src/features/preview/PreviewPanel.tsx](src/features/preview/PreviewPanel.tsx))
Markdown and text preview component.

**Features:**
- GitHub Flavored Markdown (GFM) support
- Line breaks support (remark-breaks)
- Image reference resolution (relative paths)
- Auto-encoding for paths with special characters (spaces, parentheses)
- Debounced updates (300ms)
- Blob URL caching for images (performance optimization)
- Custom image component with path resolution

**Markdown Image Path Handling:**
Automatically wraps image paths containing spaces or parentheses in angle brackets:
```markdown
![Image](path with spaces/file.png) → ![Image](<path with spaces/file.png>)
![Image](folder (1)/image.gif)      → ![Image](<folder (1)/image.gif>)
```

#### **Sidebar.tsx** ([src/features/sidebar/Sidebar.tsx](src/features/sidebar/Sidebar.tsx))
Sidebar container with switchable tabs.

**Features:**
- Files tab (FileTree component)
- Search tab (GlobalSearchPanel component)
- Tab icons: 📁 (files), 🔎 (search)
- Active tab highlighting

---

### Utility Functions

#### **File Icons** ([src/utils/fileIcons.ts](src/utils/fileIcons.ts))
Maps file extensions to emoji icons with colors:

- **Documents:** 📝 (md), 📄 (txt)
- **Web:** 🌐 (html), 🎨 (css), 📜 (js), 📘 (ts)
- **Frameworks:** ⚛️ (jsx/tsx), { } (json)
- **Languages:** 🐍 (py), ☕ (java), ©️ (c/cpp), #️⃣ (cs), 🔷 (go), 🦀 (rs)
- **Folders:** 📁 (yellow)
- **Default:** 📄 (gray)

Total coverage: 50+ file types.

#### **Code Formatter** ([src/utils/formatter.ts](src/utils/formatter.ts))
Prettier integration for code formatting.

**Supported Languages:**
- HTML, CSS, SCSS, LESS
- JavaScript, JSX
- TypeScript, TSX
- JSON
- Markdown

**Settings:**
- Tab width: 2
- Use tabs: true
- Semi: true
- Single quotes: true
- Trailing comma: ES5
- Arrow parens: always
- Print width: 80

**Usage:** Shift+Alt+F in Monaco Editor

**Unsupported Languages:**
Python, Java, C/C++, Go, Rust, etc. (Prettier doesn't support these natively)
Shows console warning: "Formatting not supported for .{ext} files"

#### **Language Mapping** ([src/utils/languageMap.ts](src/utils/languageMap.ts))
Maps 70+ file extensions to Monaco Editor language IDs.

**Supported Languages:**
- Web: html, css, scss, sass, less, javascript, typescript
- Programming: python, java, c, cpp, csharp, go, rust, php, ruby, swift, kotlin, scala
- Shell: shell, powershell, bat
- Database: sql
- Data: json, xml, yaml, toml, ini
- Other: graphql, dockerfile, protobuf, markdown, vue, svelte, etc.

#### **Path Resolver** ([src/utils/pathResolver.ts](src/utils/pathResolver.ts))
Resolves relative/absolute file paths for HTML/CSS/Markdown.

**Functions:**
- `resolveRelativePath(root, sourceFile, relativePath)`: Resolve path from source file
  - Supports `../`, `./`, and absolute paths (`/`)
  - Returns target FileNode or null
- `resolveHtmlReferences(html, root, sourceFileId)`: Inline all references in HTML
  - Images: `<img src="...">` → data URLs
  - CSS: `<link href="...">` → `<style>...</style>`
  - Scripts: `<script src="...">` → `<script>...</script>`
  - Recursive CSS @import resolution
- `resolveCssReferences(css, root, sourceFileId)`: Resolve `url()` and `@import` in CSS
- `resolveMarkdownReferences(md, root, sourceFileId)`: Resolve `![](...)` with caching

#### **Fast FS Index** ([src/utils/fsIndex.ts](src/utils/fsIndex.ts))
O(1) file system lookups instead of tree traversal.

**Index Structure:**
```typescript
{
  idToNode: Map<string, FSNode>,       // ID → node
  idToAbsPath: Map<string, string>,    // ID → absolute path
  absPathToFileId: Map<string, string> // Path → ID (dual-key: raw + encoded)
}
```

**Functions:**
- `buildFsIndex(root)`: Build index from tree (called on FS changes)
- `resolveRelativePathFast(index, sourceFileId, relativePath)`: Fast path resolution
- `resolveImgSrc(index, sourceFileId, src)`: Resolve image sources with Blob URL caching
- `cleanupBlobCache()`: Clean up Blob URLs on unmount

**Performance:** Replaces O(n) tree traversal with O(1) hash lookups.

---

### Snippet System

[src/features/templates/snippetEngine.ts](src/features/templates/snippetEngine.ts) parses VSCode-style placeholders.

**Syntax:**
- `${1:default}`, `${2:text}`, etc.
- Placeholders are numbered and can have default values
- Tab/Shift+Tab to navigate between placeholders
- Escape to exit snippet mode

**Implementation:**
- Monaco decorations with custom CSS class `.snippet-ph`
- Placeholder ranges tracked via decoration IDs
- Session state stored in ref (not Redux)
- Automatic selection of placeholder text on Tab
- Cursor moves to end of snippet when tabbing past last placeholder

**Template Toolbar:**
[src/features/templates/toolbarTemplates.ts](src/features/templates/toolbarTemplates.ts) defines language-specific templates (1132 lines).

**Supported Languages:**
- Markdown: 13 templates (headings, lists, tables, code blocks, etc.)
- Python: 12 templates (functions, classes, loops, decorators, etc.)
- C#: 12 templates (classes, properties, methods, LINQ, etc.)
- JavaScript: 17 templates (functions, arrays, promises, async/await, etc.)
- TypeScript: 15 templates (interfaces, types, generics, enums, etc.)
- HTML: 16 templates (divs, forms, tables, semantic elements, etc.)
- CSS: 12 templates (flexbox, grid, animations, media queries, etc.)
- Java: 10 templates (classes, methods, loops, try-catch, etc.)
- C/C++: 10 templates (structs, functions, main, pointers, etc.)
- Go: 10 templates (functions, structs, goroutines, channels, etc.)
- Rust: 10 templates (structs, enums, traits, impl blocks, etc.)
- PHP: 10 templates (classes, methods, namespaces, traits, etc.)
- Ruby: 10 templates (classes, modules, blocks, iterators, etc.)
- SQL: 9 templates (SELECT, INSERT, JOIN, CREATE TABLE, etc.)
- Shell/Bash: 8 templates (functions, loops, case, conditionals, etc.)
- JSX/TSX: 9 templates (components, hooks, map, conditional rendering, etc.)
- JSON: 6 templates (objects, arrays, primitives, etc.)

---

### Persistence Layer

#### **LocalStorage Auto-Save** ([src/features/fs/fsPersistence.ts](src/features/fs/fsPersistence.ts))

**Functions:**
- `loadPersistedState()`: Load FS state from localStorage on app init
- `persistState(state)`: Save FS state to localStorage (called by middleware)

**Middleware:** [src/app/store.ts](src/app/store.ts)
```typescript
persistMiddleware: debounces saves by 1 second, skips search and theme actions
```

**Keys:**
- `localStorage['live-editor-fs']`: File system state (JSON)
- `localStorage['live-editor-theme']`: Theme ('light' or 'dark')
- `localStorage['live-editor-expanded']`: Expanded folder IDs (JSON array)

**Migration:** If localStorage format changes, old data is cleared to prevent corruption.

---

### Import/Export Features

#### **Import Folder** ([src/features/fs/importFolder.ts](src/features/fs/importFolder.ts))

**Features:**
- Uses HTML5 File API with `webkitdirectory` attribute
- Supports text files and images
- Images converted to base64 data URLs
- Filters out binary files (executables, archives, etc.)
- Reconstructs folder structure from file paths
- Merges into existing file tree

**Supported File Types:**
- All text extensions (70+)
- Images: png, jpg, jpeg, gif, svg, webp, bmp, ico
- Config files: .env, Dockerfile, Makefile, etc.

**Flow:**
1. User selects folder via file picker
2. Read all files using FileReader API
3. Convert images to base64 data URLs
4. Build FSNode tree from file paths
5. Dispatch `importFolder` action
6. Redux merges new tree into root

#### **Export ZIP** ([src/features/fs/exportZip.ts](src/features/fs/exportZip.ts))

**Features:**
- Uses JSZip library
- Recursively traverses file tree
- Reconstructs folder structure
- Images decoded from base64 data URLs back to binary
- Downloads as `project.zip`

**Flow:**
1. User clicks "Export ZIP" button
2. Traverse file tree recursively
3. Add files to JSZip instance
4. Generate ZIP blob
5. Trigger browser download

---

### Search Implementation

#### **Search Selectors** ([src/features/fs/fsSelectors.ts](src/features/fs/fsSelectors.ts))

**Memoized Selectors:**
- `selectActiveFile`: Get active file node
- `selectOpenFiles`: Get all open file nodes
- `selectAllExtensions`: Get unique extensions for filter UI
- `selectGlobalSearchResults`: Compute search results

**Search Algorithm:**
```typescript
function selectGlobalSearchResults(state) {
  // 1. Filter by search mode (all, names, content)
  // 2. Filter by extension
  // 3. Apply case sensitivity
  // 4. For names: match against file/folder names
  // 5. For content: line-by-line search with position tracking
  // 6. Return results with: file path, line, column, preview
}
```

**Result Structure:**
```typescript
type SearchResult = {
  node: FSNode;
  path: string;        // Display path
  line?: number;       // For content matches
  column?: number;     // For content matches
  preview?: string;    // Context snippet
  type: 'name' | 'content';
}
```

---

## File Type Support

### Editor Languages (70+ extensions)

**Web Technologies:**
- HTML: html, htm
- CSS: css, scss, sass, less
- JavaScript: js, jsx, mjs, cjs
- TypeScript: ts, tsx

**Data/Config:**
- json, jsonc, xml, yaml, yml, toml, ini

**Documentation:**
- md, markdown, txt

**Programming Languages:**
- Python: py, pyw
- Java: java
- C: c, h
- C++: cpp, cc, cxx, hpp, hh, hxx
- C#: cs, csx
- Go: go
- Rust: rs
- PHP: php, phtml
- Ruby: rb
- Swift: swift
- Kotlin: kt, kts
- Scala: scala, sc
- R: r
- Lua: lua
- Perl: perl, pl, pm

**Shell/Scripts:**
- sh, bash, zsh
- PowerShell: ps1, psm1
- Batch: bat, cmd

**Database:**
- SQL: sql

**Frameworks:**
- Vue: vue
- Svelte: svelte

**Other:**
- GraphQL: graphql, gql
- Dockerfile: dockerfile
- Protocol Buffers: proto
- Solidity: sol
- Redis: redis
- Handlebars: handlebars, hbs
- Pug: pug, jade
- CoffeeScript: coffee
- Dart: dart
- Clojure: clj, cljs, cljc
- Elixir: ex, exs
- Erlang: erl, hrl
- F#: fs, fsi, fsx
- OCaml: ml, mli
- Pascal: pas
- Visual Basic: vb

### File Type Behaviors

1. **Text Files:** Monaco Editor with syntax highlighting
2. **Markdown (.md):** Split-pane editor + live preview
3. **HTML (.html, .htm):** Split-pane editor + iframe preview
4. **Images (png, jpg, gif, svg, webp, bmp, ico):** Image viewer
5. **All Files:** Can toggle to hex viewer

---

## Keyboard Shortcuts

### Editor Shortcuts
- **Tab:** Next snippet placeholder (when in snippet mode)
- **Shift+Tab:** Previous snippet placeholder
- **Escape:** Exit snippet mode
- **Shift+Alt+F:** Format code with Prettier
- **Ctrl+F / Cmd+F:** Find (Monaco built-in)
- **Ctrl+H / Cmd+H:** Find and Replace (Monaco built-in)

### Monaco Editor Built-In Shortcuts
Monaco Editor includes all standard VSCode shortcuts:
- **Ctrl+Z / Cmd+Z:** Undo
- **Ctrl+Y / Cmd+Shift+Z:** Redo
- **Ctrl+A / Cmd+A:** Select All
- **Ctrl+D / Cmd+D:** Add selection to next find match
- **Alt+Click:** Add cursor
- **Ctrl+/ / Cmd+/:** Toggle line comment
- **Shift+Alt+A / Shift+Cmd+A:** Toggle block comment
- **Alt+Up/Down:** Move line up/down
- **Shift+Alt+Up/Down:** Copy line up/down
- And many more...

### General Shortcuts
- **Right-click:** Context menu (file tree, tabs)
- **Click:** Select file, open tab, insert template

---

## Code Patterns and Best Practices

### File Operations
All CRUD operations go through Redux actions:
```typescript
// Create
dispatch(createFile({ parentId, name, extension, content }))
dispatch(createFolder({ parentId, name }))

// Read
const file = useAppSelector(selectActiveFile)

// Update
dispatch(updateFileContent({ id, content }))
dispatch(renameNode({ id, newName }))

// Delete
dispatch(deleteNode({ id }))
```

### Selectors
Use memoized selectors for derived data:
```typescript
import { selectActiveFile, selectGlobalSearchResults } from '@/features/fs/fsSelectors';

const file = useAppSelector(selectActiveFile);
const results = useAppSelector(selectGlobalSearchResults);
```

### File Name Parsing
Use `parseFileName()` for edge cases:
```typescript
parseFileName('.env')        → { name: '', extension: '.env' }
parseFileName('README.md')   → { name: 'README', extension: 'md' }
parseFileName('foo.test.js') → { name: 'foo.test', extension: 'js' }
```

### Path Resolution
For HTML/CSS/Markdown references:
```typescript
import { resolveRelativePath } from '@/utils/pathResolver';

const targetFile = resolveRelativePath(root, sourceFile, '../images/logo.png');
```

For fast lookups (in loops, previews):
```typescript
import { buildFsIndex, resolveRelativePathFast } from '@/utils/fsIndex';

const index = buildFsIndex(root);
const file = resolveRelativePathFast(index, sourceFileId, './style.css');
```

---

## Styling

### Tailwind CSS
- **Configuration:** [tailwind.config.js](tailwind.config.js)
- **Dark Mode:** `darkMode: 'class'` (toggled via `<html class="dark">`)
- **Plugins:** `@tailwindcss/typography` for markdown prose styling

### Global Styles ([src/index.css](src/index.css))
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Monaco Editor tooltip disabling */
.monaco-editor .monaco-hover { display: none !important; }

/* Keep important widgets visible */
.monaco-editor .find-widget { z-index: 1000; }
```

### Component Styles
- Most components use Tailwind utility classes
- Dark mode variants: `dark:bg-slate-900`, `dark:text-white`
- Responsive utilities: `sm:`, `md:`, `lg:`
- Custom classes: `.snippet-ph` for snippet placeholders

---

## Performance Optimizations

1. **Debounced LocalStorage saves:** 1-second delay to prevent excessive writes
2. **Debounced previews:** 300ms for HTML/Markdown to reduce flashing
3. **Memoized selectors:** Redux Toolkit `createSelector` for search results
4. **React.memo:** FileTreeNode component to prevent unnecessary re-renders
5. **Fast index:** O(1) path lookups instead of O(n) tree traversal
6. **Blob URL caching:** Image references use cached Blob URLs for performance
7. **Lazy imports:** Code splitting for heavy dependencies (if needed in future)

---

## Error Handling

### Validation
- File/folder name validation (no special characters, no duplicates)
- Extension validation (no slashes, dots, etc.)
- Inline error messages in forms

### Confirmation Dialogs
- Delete operations show browser confirm() dialog
- Import folder warns about large file counts (if implemented)

### Try-Catch Blocks
- File operations (import, export)
- Code formatting (Prettier errors)
- Path resolution (malformed paths)
- LocalStorage operations (quota exceeded)

### Graceful Fallbacks
- Invalid paths return null
- Missing files use placeholder icons
- Formatting errors return original code
- Search with no results shows empty state

---

## Testing Strategy

### Manual Testing Checklist
- [ ] Create file/folder
- [ ] Rename file/folder
- [ ] Delete file/folder
- [ ] Open/close tabs
- [ ] Pin/unpin tabs
- [ ] Search (all modes, case sensitivity, filters)
- [ ] Markdown preview (images, formatting)
- [ ] HTML preview (CSS/JS inlining)
- [ ] Code formatting (all supported languages)
- [ ] Snippet navigation (Tab, Shift+Tab, Escape)
- [ ] Import folder
- [ ] Export ZIP
- [ ] Theme toggle
- [ ] Sidebar resize
- [ ] Hex viewer (modes, bytes per row)
- [ ] LocalStorage persistence (refresh page)

### Edge Cases to Test
- Empty file names
- Duplicate names
- Very long file paths
- Special characters in paths (spaces, parentheses)
- Large files (> 1MB)
- Many files (> 1000)
- Deeply nested folders (> 10 levels)
- Markdown with complex image paths
- HTML with recursive CSS imports

---

## Extensibility Points

### Adding New Languages
1. Add extension mapping to [src/utils/languageMap.ts](src/utils/languageMap.ts)
2. Add file icon to [src/utils/fileIcons.ts](src/utils/fileIcons.ts)
3. Add templates to [src/features/templates/toolbarTemplates.ts](src/features/templates/toolbarTemplates.ts)
4. Add formatter support to [src/utils/formatter.ts](src/utils/formatter.ts) (if Prettier supports it)

### Adding New Features
1. Create feature folder under `src/features/`
2. Add Redux slice if needed
3. Wire up to [src/App.tsx](src/App.tsx) or existing components
4. Add keyboard shortcuts in EditorPanel if needed

### Adding New File Viewers
1. Add condition in [src/features/editor/EditorPanel.tsx](src/features/editor/EditorPanel.tsx)
2. Create viewer component (e.g., PdfViewer, VideoPlayer)
3. Handle file type detection based on extension

### Adding Server Features
If you want to add backend features (e.g., Python formatter, Git integration, collaboration):
1. Set up backend API (Express, FastAPI, etc.)
2. Add API client utility in `src/utils/`
3. Add async thunks to Redux slices
4. Handle loading/error states in components

---

## Troubleshooting

### Common Issues

**Monaco Editor not loading:**
- Check browser console for errors
- Verify `@monaco-editor/react` version compatibility
- Clear localStorage and refresh

**Search not working:**
- Check search mode (names vs content)
- Verify extension filters
- Check case sensitivity setting

**Import folder not working:**
- Browser must support `webkitdirectory` attribute (Chrome, Edge, Safari)
- Check file size limits (some browsers limit to ~50MB)
- Verify file types are supported

**Formatting not working:**
- Check file extension is supported
- Verify Prettier dependencies are installed
- Check browser console for errors
- Try formatting a simple file first

**LocalStorage quota exceeded:**
- Check total storage used: `localStorage.length`
- Clear old data: `localStorage.clear()`
- Reduce file count or content size
- Consider IndexedDB for larger projects (future enhancement)

**Performance issues:**
- Check file count (> 1000 files may slow down)
- Check file sizes (large files may cause lag)
- Disable search filters if not needed
- Close unused tabs

---

## Future Enhancement Ideas

See [FEATURE_IDEAS.md](FEATURE_IDEAS.md) for a comprehensive list of potential features, organized by priority and effort.

**High-Priority Items:**
1. Command Palette (Ctrl+P) for quick file navigation
2. Syntax highlighting in markdown code blocks
3. Split editor view (side-by-side editing)
4. Auto-save indicator
5. Breadcrumb navigation
6. Find & replace in current file
7. Version control/snapshots
8. Linting/error checking
9. Multi-cursor editing (Monaco already supports this)
10. Format on save toggle

---

## References

### Dependencies Documentation
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Markdown](https://github.com/remarkjs/react-markdown)
- [Prettier](https://prettier.io/docs/)
- [JSZip](https://stuk.github.io/jszip/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### File System API
- [File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)
- [LocalStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

---

## Project Statistics

- **Total Lines of Code:** ~8,000+
- **React Components:** 15+
- **Redux Slices:** 2
- **Utility Functions:** 30+
- **Supported Languages:** 70+
- **Template Snippets:** 170+
- **File Icons:** 50+
- **Dependencies:** 11 production, 13 development

---

## Maintainer Notes

This project is designed to run entirely in the browser with no backend. All data is stored in localStorage. For production use, consider:

1. **Storage Limits:** LocalStorage is limited to ~5-10MB. For larger projects, migrate to IndexedDB.
2. **Security:** All code runs client-side. No server-side validation or sanitization.
3. **Browser Support:** Requires modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+).
4. **Performance:** Best with < 1000 files and < 50MB total size.
5. **Collaboration:** Single-user only. For multi-user, add backend with WebSockets or CRDTs.

---

**Last Updated:** 2025-12-29
