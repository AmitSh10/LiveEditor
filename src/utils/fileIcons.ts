export type FileIconConfig = {
	icon: string;
	color: string;
};

const iconMap: Record<string, FileIconConfig> = {
	// Documents
	md: { icon: '📝', color: 'text-blue-400' },
	txt: { icon: '📄', color: 'text-slate-400' },

	// Web
	html: { icon: '🌐', color: 'text-orange-400' },
	css: { icon: '🎨', color: 'text-pink-400' },

	// JavaScript/TypeScript
	js: { icon: '📜', color: 'text-yellow-400' },
	ts: { icon: '📘', color: 'text-blue-500' },
	jsx: { icon: '⚛️', color: 'text-cyan-400' },
	tsx: { icon: '⚛️', color: 'text-cyan-500' },
	json: { icon: '{ }', color: 'text-yellow-300' },

	// Python
	py: { icon: '🐍', color: 'text-green-400' },

	// C/C++/C#
	c: { icon: '©️', color: 'text-blue-300' },
	cpp: { icon: '©️', color: 'text-blue-400' },
	cs: { icon: '#️⃣', color: 'text-purple-400' },

	// Other
	java: { icon: '☕', color: 'text-red-400' },
	go: { icon: '🔷', color: 'text-cyan-300' },
	rs: { icon: '🦀', color: 'text-orange-500' },
	sh: { icon: '💻', color: 'text-green-300' },
	yml: { icon: '⚙️', color: 'text-slate-300' },
	yaml: { icon: '⚙️', color: 'text-slate-300' },
	xml: { icon: '📋', color: 'text-orange-300' },
};

const folderIcon: FileIconConfig = { icon: '📁', color: 'text-yellow-500' };
const defaultFileIcon: FileIconConfig = { icon: '📄', color: 'text-slate-400' };

export function getFileIcon(extension: string): FileIconConfig {
	return iconMap[extension.toLowerCase()] || defaultFileIcon;
}

export function getFolderIcon(): FileIconConfig {
	return folderIcon;
}
