/**
 * Maps file extensions to Monaco Editor language IDs
 * Monaco supports many languages out of the box
 */
export const extensionToLanguage: Record<string, string> = {
	// Web
	html: 'html',
	htm: 'html',
	css: 'css',
	scss: 'scss',
	sass: 'sass',
	less: 'less',

	// JavaScript/TypeScript
	js: 'javascript',
	jsx: 'javascript',
	mjs: 'javascript',
	cjs: 'javascript',
	ts: 'typescript',
	tsx: 'typescript',

	// Data/Config
	json: 'json',
	jsonc: 'json',
	xml: 'xml',
	yaml: 'yaml',
	yml: 'yaml',
	toml: 'toml',
	ini: 'ini',

	// Documentation
	md: 'markdown',
	markdown: 'markdown',
	txt: 'plaintext',

	// Programming Languages
	py: 'python',
	pyw: 'python',

	java: 'java',

	c: 'c',
	h: 'c',

	cpp: 'cpp',
	cc: 'cpp',
	cxx: 'cpp',
	hpp: 'cpp',
	hh: 'cpp',
	hxx: 'cpp',

	cs: 'csharp',
	csx: 'csharp',

	go: 'go',

	rs: 'rust',

	php: 'php',
	phtml: 'php',

	rb: 'ruby',

	swift: 'swift',

	kt: 'kotlin',
	kts: 'kotlin',

	scala: 'scala',
	sc: 'scala',

	r: 'r',

	lua: 'lua',

	perl: 'perl',
	pl: 'perl',
	pm: 'perl',

	// Shell
	sh: 'shell',
	bash: 'shell',
	zsh: 'shell',

	ps1: 'powershell',
	psm1: 'powershell',

	bat: 'bat',
	cmd: 'bat',

	// Database
	sql: 'sql',

	// Frameworks/Libraries
	vue: 'vue',
	svelte: 'svelte',

	// Other
	graphql: 'graphql',
	gql: 'graphql',

	dockerfile: 'dockerfile',

	proto: 'protobuf',

	sol: 'sol',

	redis: 'redis',

	handlebars: 'handlebars',
	hbs: 'handlebars',

	pug: 'pug',
	jade: 'pug',

	coffee: 'coffeescript',

	dart: 'dart',

	clj: 'clojure',
	cljs: 'clojure',
	cljc: 'clojure',

	ex: 'elixir',
	exs: 'elixir',

	erl: 'erlang',
	hrl: 'erlang',

	fs: 'fsharp',
	fsi: 'fsharp',
	fsx: 'fsharp',

	ml: 'ocaml',
	mli: 'ocaml',

	pas: 'pascal',

	vb: 'vb',
};

/**
 * Get Monaco language ID from file extension
 */
export function getLanguageFromExtension(ext: string): string {
	const normalized = ext.toLowerCase().trim();
	return extensionToLanguage[normalized] || 'plaintext';
}
