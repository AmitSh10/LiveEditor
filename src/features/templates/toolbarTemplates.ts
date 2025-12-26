export type ToolbarButton = {
	id: string;
	label: string;
	insert: string;
};

export const toolbarTemplates: Record<string, ToolbarButton[]> = {
	md: [
		{ id: 'h1', label: 'H1', insert: '# ${1:text}\n' },
		{ id: 'h2', label: 'H2', insert: '## ${1:text}\n' },
		{ id: 'list', label: 'List', insert: '- ${1:text}\n' },
		{ id: 'code', label: 'Code', insert: '```\n${1:text}\n```\n' },
		{
			id: 'table',
			label: 'Table',
			insert: '| Head1 | Head2 | Head3 |\n| --- | --- | --- |\n| Val1 | Val2 | Val3 |\n',
		},
		{
			id: 'link',
			label: 'Link',
			insert: '[${1:text}](${2:https://example.com})\n',
		},
		{
			id: 'image',
			label: 'Image',
			insert: '![${1:alt}](${2:https://example.com/image.png})\n',
		},
	],

	py: [
		{
			id: 'def',
			label: 'def',
			insert: 'def ${1:name}(${2:args}):\n    ${3:pass}\n',
		},
		{
			id: 'class',
			label: 'class',
			insert: 'class Name:\n    def __init__(self):\n        \n',
		},
		{ id: 'for', label: 'for', insert: 'for i in range():\n    \n' },
	],

	cs: [
		{
			id: 'method',
			label: 'method',
			insert: 'public void MethodName()\n{\n    \n}\n',
		},
		{
			id: 'class',
			label: 'class',
			insert: 'public class Name\n{\n    \n}\n',
		},
		{
			id: 'for',
			label: 'for',
			insert: 'for (int i = 0; i < ; i++)\n{\n    \n}\n',
		},
	],

	js: [
		{ id: 'func', label: 'Function', insert: 'function name() {\n  \n}\n' },
		{ id: 'class', label: 'Class', insert: 'class Name {\n  \n}\n' },
		{
			id: 'loop',
			label: 'Loop',
			insert: 'for (let i = 0; i < ; i++) {\n  \n}\n',
		},
	],

	ts: [
		{
			id: 'func',
			label: 'Function',
			insert: 'function name(): void {\n  \n}\n',
		},
		{ id: 'class', label: 'Class', insert: 'class Name {\n  \n}\n' },
		{
			id: 'loop',
			label: 'Loop',
			insert: 'for (let i = 0; i < ; i++) {\n  \n}\n',
		},
	],
};
