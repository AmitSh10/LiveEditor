export type ToolbarButton = {
	id: string;
	label: string;
	insert: string;
};

export const toolbarTemplates: Record<string, ToolbarButton[]> = {
	md: [
		{ id: 'h1', label: 'H1', insert: '# ${1:text}${0:}\n' },
		{ id: 'h2', label: 'H2', insert: '## ${1:text}${0:}\n' },
		{ id: 'list', label: 'List', insert: '- ${1:text}${0:}\n' },
		{ id: 'code', label: 'Code', insert: '```\n${1:text}\n```${0:}\n' },
		{
			id: 'table',
			label: 'Table',
			insert:
				'| ${1:Head1} | ${2:Head2} | ${3:Head3} |\n' +
				'| --- | --- | --- |\n' +
				'| ${4:Val1} | ${5:Val2} | ${6:Val3} |${0:}\n',
		},
		{
			id: 'link',
			label: 'Link',
			insert: '[${1:text}](${2:https://example.com})${0:}\n',
		},
		{
			id: 'image',
			label: 'Image',
			insert: '![${1:alt}](${2:https://example.com/image.png})${0:}\n',
		},
	],

	py: [
		{
			id: 'def',
			label: 'def',
			insert: 'def ${1:name}(${2:args}):\n    ${0:pass}\n',
		},
		{
			id: 'class',
			label: 'class',
			insert:
				'class ${1:Name}:\n' +
				'    def __init__(self${2:, args}):\n' +
				'        ${0:pass}\n',
		},
		{
			id: 'for',
			label: 'for',
			insert: 'for ${1:i} in range(${2:n}):\n    ${0:pass}\n',
		},
	],

	cs: [
		{
			id: 'method',
			label: 'method',
			insert: 'public void ${1:MethodName}()\n{\n    ${0:}\n}\n',
		},
		{
			id: 'class',
			label: 'class',
			insert: 'public class ${1:Name}\n{\n    ${0:}\n}\n',
		},
		{
			id: 'for',
			label: 'for',
			insert:
				'for (int i = 0; i < ${1:n}; i++)\n' +
				'{\n' +
				'    ${0:}\n' +
				'}\n',
		},
	],

	js: [
		{
			id: 'func',
			label: 'Function',
			insert: 'function ${1:name}(${2:args}) {\n  ${0:}\n}\n',
		},
		{
			id: 'class',
			label: 'Class',
			insert:
				'class ${1:Name} {\n' +
				'  constructor(${2:args}) {\n' +
				'    ${0:}\n' +
				'  }\n' +
				'}\n',
		},
		{
			id: 'loop',
			label: 'Loop',
			insert: 'for (let i = 0; i < ${1:n}; i++) {\n  ${0:}\n}\n',
		},
	],

	ts: [
		{
			id: 'func',
			label: 'Function',
			insert: 'function ${1:name}(${2:args}): void {\n  ${0:}\n}\n',
		},
		{
			id: 'class',
			label: 'Class',
			insert:
				'class ${1:Name} {\n' +
				'  constructor(${2:args}) {\n' +
				'    ${0:}\n' +
				'  }\n' +
				'}\n',
		},
		{
			id: 'loop',
			label: 'Loop',
			insert: 'for (let i = 0; i < ${1:n}; i++) {\n  ${0:}\n}\n',
		},
	],
};
