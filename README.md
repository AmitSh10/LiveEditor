# Live Editor

A fully-featured, browser-based code editor with an in-memory file system. Built with React, TypeScript, and Monaco Editor (VSCode's editor core).

![Live Editor](https://img.shields.io/badge/React-19.2-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Monaco Editor](https://img.shields.io/badge/Monaco-Editor-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## 🚀 Main Idea

**Live Editor** is a complete code editing environment that runs entirely in your browser. No server required, no installations needed—just open it and start coding. Perfect for:

- 📝 Quick prototyping and experimentation
- 📚 Documentation with live Markdown preview
- 🎓 Learning to code with syntax highlighting for 70+ languages
- 💼 Sharing code snippets and projects as ZIP files
- 🌐 Building static websites with HTML/CSS/JS preview
- 🔍 Searching across multiple files in your project

All your work is automatically saved to your browser's LocalStorage, so you never lose your progress.

---

## ✨ Key Features

### 🎨 **Monaco Editor Integration**
- **Syntax highlighting** for 70+ programming languages
- **Code formatting** with Prettier (Shift+Alt+F)
- **All VSCode shortcuts**: multi-cursor editing, find/replace, code folding, and more
- **Smart indentation** and auto-closing brackets
- **Snippet system** with tab-stop navigation (170+ built-in templates)

### 📁 **Complete File System**
- **Create, rename, delete** files and folders
- **Drag-free organization** with context menus
- **Import folders** from your computer
- **Export projects** as ZIP files
- **Pin important files** in tabs
- **Persistent storage** via LocalStorage

### 🔍 **Powerful Search**
- **Global search** across all files
- **Search modes**: Names only, Content only, or Both
- **Case-sensitive** toggle
- **Extension filters** (e.g., search only .js files)
- **Preview snippets** with line/column positions
- **Click to reveal** in editor

### 📺 **Live Preview**
- **Markdown preview** with GitHub Flavored Markdown (GFM)
  - Tables, task lists, strikethrough, autolinks
  - Image support with relative path resolution
  - Auto-encoding for paths with spaces/parentheses
- **HTML preview** with sandboxed iframe
  - Auto-inlines CSS and JavaScript
  - Resolves relative references
  - Debounced updates (300ms) to reduce flashing

### 🖼️ **Multi-Format Support**
- **Text editor** for all code files
- **Image viewer** for png, jpg, gif, svg, webp, bmp, ico
- **Hex viewer** for binary files (with configurable display modes)
- **Split-pane view** for Markdown and HTML editing

### 🎯 **170+ Code Templates**
Pre-built snippets for common patterns in:
- **Markdown**: Headings, lists, tables, code blocks (13 templates)
- **JavaScript**: Functions, arrays, promises, async/await (17 templates)
- **TypeScript**: Interfaces, types, generics, enums (15 templates)
- **HTML**: Divs, forms, tables, semantic elements (16 templates)
- **CSS**: Flexbox, grid, animations, media queries (12 templates)
- **Python**: Functions, classes, loops, decorators (12 templates)
- **And 12 more languages**: C#, Java, C/C++, Go, Rust, PHP, Ruby, SQL, Shell, JSX/TSX, JSON

### 🌓 **Dark/Light Theme**
- Toggle between dark and light modes
- Persists your preference
- Optimized for both coding and reading

### 🔧 **Developer-Friendly**
- **Tab management**: Open, close, pin tabs
- **Context menus**: Right-click for quick actions
- **Copy paths**: Absolute or relative to active file
- **Keyboard shortcuts**: All standard VSCode shortcuts work
- **Auto-save**: Debounced saves every second

---

## 🎬 Quick Start

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/live-editor.git
cd live-editor

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
# Build the project
npm run build

# Preview production build
npm run preview
```

---

## 📖 Usage

### Creating Files and Folders
1. Right-click in the file tree
2. Select "New File" or "New Folder"
3. Type the name and press Enter

### Opening Files
- Click on a file in the file tree
- Files open in tabs at the top of the editor

### Searching
1. Click the 🔎 (Search) tab in the sidebar
2. Type your search query
3. Filter by file extension if needed
4. Click results to jump to that location

### Code Formatting
1. Open a supported file (HTML, CSS, JS, TS, JSON, MD)
2. Press **Shift+Alt+F**
3. Code is automatically formatted with Prettier

### Using Snippets
1. Open a file (e.g., `.js` file)
2. Click a template button (e.g., "Function")
3. Press **Tab** to jump between placeholders
4. Press **Shift+Tab** to go back
5. Press **Escape** to exit snippet mode

### Importing a Folder
1. Click "Import Folder" in the top-right
2. Select a folder from your computer
3. All text files and images are imported

### Exporting Your Project
1. Click "Export ZIP" in the top-right
2. A `project.zip` file downloads with your entire project

---

## 🗂️ Project Structure

```
live-editor/
├── src/
│   ├── app/              # Redux store and hooks
│   ├── features/         # Feature modules
│   │   ├── editor/       # Monaco Editor + TabsBar + HexViewer
│   │   ├── fs/           # File system (Redux slice, tree, CRUD)
│   │   ├── preview/      # Markdown/HTML preview
│   │   ├── search/       # Global search panel
│   │   ├── sidebar/      # Sidebar with tabs
│   │   ├── templates/    # Code snippets (170+ templates)
│   │   └── theme/        # Dark/light theme state
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utilities (icons, formatter, paths, etc.)
│   ├── App.tsx           # Main app component
│   └── main.tsx          # React entry point
├── public/               # Static assets
├── package.json          # Dependencies
├── vite.config.ts        # Vite configuration
└── README.md             # This file
```

For detailed architecture documentation, see [CLAUDE.md](CLAUDE.md).

---

## 🛠️ Tech Stack

### Core
- **React 19.2** - UI framework
- **TypeScript 5.9** - Type safety
- **Vite 7.2** - Build tool

### Editor
- **Monaco Editor 4.7** - Code editor (VSCode core)
- **Prettier 3.7** - Code formatting

### State Management
- **Redux Toolkit 2.11** - Global state
- **React Redux 9.2** - React bindings

### Markdown
- **React Markdown 10.1** - Markdown rendering
- **remark-gfm 4.0** - GitHub Flavored Markdown
- **remark-breaks 4.0** - Line breaks support

### Styling
- **Tailwind CSS 3.4** - Utility-first CSS
- **@tailwindcss/typography** - Markdown prose styling

### Utilities
- **JSZip 3.10** - ZIP file generation

---

## 📝 Supported Languages (70+)

### Web Technologies
HTML, CSS, SCSS, Sass, Less, JavaScript, JSX, TypeScript, TSX

### Programming Languages
Python, Java, C, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Scala, R, Lua, Perl

### Shell & Scripts
Bash, Zsh, PowerShell, Batch

### Data Formats
JSON, XML, YAML, TOML, INI

### Databases
SQL

### Frameworks & Tools
Vue, Svelte, GraphQL, Dockerfile, Protocol Buffers, Markdown

### And Many More!
CoffeeScript, Dart, Clojure, Elixir, Erlang, F#, OCaml, Pascal, Visual Basic, Handlebars, Pug, Solidity, Redis

---

## ⌨️ Keyboard Shortcuts

### Editor
- **Tab** - Next snippet placeholder
- **Shift+Tab** - Previous placeholder
- **Escape** - Exit snippet mode
- **Shift+Alt+F** - Format code

### Monaco Editor (Built-In)
- **Ctrl/Cmd+F** - Find
- **Ctrl/Cmd+H** - Find and Replace
- **Ctrl/Cmd+Z** - Undo
- **Ctrl/Cmd+Y** - Redo
- **Ctrl/Cmd+D** - Add selection to next find match
- **Alt+Click** - Add cursor
- **Ctrl/Cmd+/** - Toggle line comment
- **Alt+Up/Down** - Move line up/down
- **Shift+Alt+Up/Down** - Copy line up/down

And all other VSCode shortcuts!

---

## 🎯 Use Cases

### 1. **Quick Prototyping**
Need to test an idea? Create HTML/CSS/JS files and see results instantly.

### 2. **Learning to Code**
Practice coding with syntax highlighting, templates, and instant feedback.

### 3. **Documentation**
Write documentation in Markdown with live preview and image support.

### 4. **Code Snippets**
Save and organize your code snippets across multiple files.

### 5. **Interview Prep**
Practice coding problems with syntax highlighting and multiple language support.

### 6. **Teaching**
Share projects as ZIP files or demonstrate code concepts live.

---

## 🔒 Privacy & Storage

- **100% client-side**: All code runs in your browser
- **No server uploads**: Your code never leaves your computer
- **LocalStorage**: Files saved automatically to browser storage
- **Storage limit**: ~5-10MB (varies by browser)
- **Clear data**: Clear browser data to reset

For larger projects, consider migrating to IndexedDB (see [FEATURE_IDEAS.md](FEATURE_IDEAS.md)).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow existing code patterns
- Use Prettier for formatting
- Add comments for complex logic

---

## 📋 Roadmap

See [FEATURE_IDEAS.md](FEATURE_IDEAS.md) for a comprehensive list of planned features.

### High Priority
- [ ] Command Palette (Ctrl+P) for quick file navigation
- [ ] Syntax highlighting in markdown code blocks
- [ ] Split editor view (side-by-side editing)
- [ ] Auto-save indicator
- [ ] Breadcrumb navigation
- [ ] Find & replace in current file
- [ ] Version control/snapshots
- [ ] Linting/error checking

---

## 🐛 Known Limitations

1. **Storage**: Limited to ~5-10MB in LocalStorage
2. **Performance**: Best with < 1000 files and < 50MB total size
3. **Collaboration**: Single-user only (no real-time collaboration)
4. **Formatting**: Only supports web languages (no Python, Java, etc. formatting)
5. **Import**: Browser must support `webkitdirectory` (Chrome, Edge, Safari)

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Monaco Editor** - Microsoft's incredible code editor
- **Prettier** - Code formatting
- **Redux Toolkit** - State management
- **Tailwind CSS** - Styling framework
- **React Markdown** - Markdown rendering

---

## 📞 Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/yourusername/live-editor/issues) page.

---

## 🌟 Show Your Support

If you find this project helpful, please consider giving it a ⭐ on GitHub!

---

**Built with ❤️ using React, TypeScript, and Monaco Editor**

*Last Updated: 2025-12-29*
