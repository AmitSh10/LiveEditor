export type ToolbarButton = {
	id: string;
	label: string;
	insert: string;
};

export const toolbarTemplates: Record<string, ToolbarButton[]> = {
	// Markdown
	md: [
		{ id: 'h1', label: 'H1', insert: '# ${1:Heading 1}${0:}\n' },
		{ id: 'h2', label: 'H2', insert: '## ${1:Heading 2}${0:}\n' },
		{ id: 'h3', label: 'H3', insert: '### ${1:Heading 3}${0:}\n' },
		{ id: 'bold', label: 'Bold', insert: '**${1:bold text}**${0:}' },
		{ id: 'italic', label: 'Italic', insert: '*${1:italic text}*${0:}' },
		{ id: 'code', label: 'Inline Code', insert: '`${1:code}`${0:}' },
		{
			id: 'codeblock',
			label: 'Code Block',
			insert: '```${1:javascript}\n${2:code}\n```${0:}\n',
		},
		{
			id: 'link',
			label: 'Link',
			insert: '[${1:link text}](${2:https://example.com})${0:}',
		},
		{
			id: 'image',
			label: 'Image',
			insert: '![${1:alt text}](${2:image.png})${0:}',
		},
		{
			id: 'ul',
			label: 'Bullet List',
			insert: '- ${1:item 1}\n- ${2:item 2}\n- ${3:item 3}${0:}\n',
		},
		{
			id: 'ol',
			label: 'Numbered List',
			insert: '1. ${1:item 1}\n2. ${2:item 2}\n3. ${3:item 3}${0:}\n',
		},
		{ id: 'quote', label: 'Quote', insert: '> ${1:quote}${0:}\n' },
		{ id: 'hr', label: 'Divider', insert: '---${0:}\n' },
		{
			id: 'table',
			label: 'Table',
			insert: '| ${1:Column 1} | ${2:Column 2} | ${3:Column 3} |\n| --- | --- | --- |\n| ${4:Data 1} | ${5:Data 2} | ${6:Data 3} |\n| ${7:Data 4} | ${8:Data 5} | ${9:Data 6} |${0:}\n',
		},
		{
			id: 'task',
			label: 'Task List',
			insert: '- [ ] ${1:Task 1}\n- [ ] ${2:Task 2}\n- [x] ${3:Completed task}${0:}\n',
		},
	],

	// Python
	py: [
		{
			id: 'def',
			label: 'Function',
			insert: 'def ${1:function_name}(${2:args}):\n    """${3:Description}"""\n    ${0:pass}\n',
		},
		{
			id: 'class',
			label: 'Class',
			insert: 'class ${1:ClassName}:\n    """${2:Description}"""\n    \n    def __init__(self${3:, args}):\n        ${0:pass}\n',
		},
		{
			id: 'if',
			label: 'If',
			insert: 'if ${1:condition}:\n    ${0:pass}\n',
		},
		{
			id: 'elif',
			label: 'If-Elif-Else',
			insert: 'if ${1:condition}:\n    ${2:pass}\nelif ${3:condition}:\n    ${4:pass}\nelse:\n    ${0:pass}\n',
		},
		{
			id: 'for',
			label: 'For Loop',
			insert: 'for ${1:item} in ${2:iterable}:\n    ${0:pass}\n',
		},
		{
			id: 'while',
			label: 'While Loop',
			insert: 'while ${1:condition}:\n    ${0:pass}\n',
		},
		{
			id: 'try',
			label: 'Try-Except',
			insert: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${0:pass}\n',
		},
		{
			id: 'with',
			label: 'With',
			insert: 'with ${1:expression} as ${2:variable}:\n    ${0:pass}\n',
		},
		{ id: 'lambda', label: 'Lambda', insert: 'lambda ${1:x}: ${0:x}\n' },
		{
			id: 'list',
			label: 'List Comp',
			insert: '[${1:x} for ${2:x} in ${3:iterable} if ${4:condition}]${0:}\n',
		},
		{
			id: 'dict',
			label: 'Dict Comp',
			insert: '{${1:k}: ${2:v} for ${3:k}, ${4:v} in ${5:items}}${0:}\n',
		},
		{
			id: 'main',
			label: 'Main',
			insert: 'if __name__ == "__main__":\n    ${0:main()}\n',
		},
	],

	// C#
	cs: [
		{
			id: 'class',
			label: 'Class',
			insert: 'public class ${1:ClassName}\n{\n    ${0:}\n}\n',
		},
		{
			id: 'method',
			label: 'Method',
			insert: 'public ${1:void} ${2:MethodName}(${3:args})\n{\n    ${0:}\n}\n',
		},
		{
			id: 'prop',
			label: 'Property',
			insert: 'public ${1:string} ${2:PropertyName} { get; set; }${0:}\n',
		},
		{
			id: 'propfull',
			label: 'Full Property',
			insert: 'private ${1:string} _${2:propertyName};\npublic ${1:string} ${2/(.*)/${1:/capitalize}/}\n{\n    get { return _${2:propertyName}; }\n    set { _${2:propertyName} = value; }\n}${0:}\n',
		},
		{
			id: 'ctor',
			label: 'Constructor',
			insert: 'public ${1:ClassName}(${2:args})\n{\n    ${0:}\n}\n',
		},
		{
			id: 'if',
			label: 'If',
			insert: 'if (${1:condition})\n{\n    ${0:}\n}\n',
		},
		{
			id: 'else',
			label: 'If-Else',
			insert: 'if (${1:condition})\n{\n    ${2:}\n}\nelse\n{\n    ${0:}\n}\n',
		},
		{
			id: 'for',
			label: 'For Loop',
			insert: 'for (int ${1:i} = 0; ${1:i} < ${2:count}; ${1:i}++)\n{\n    ${0:}\n}\n',
		},
		{
			id: 'foreach',
			label: 'ForEach',
			insert: 'foreach (var ${1:item} in ${2:collection})\n{\n    ${0:}\n}\n',
		},
		{
			id: 'while',
			label: 'While',
			insert: 'while (${1:condition})\n{\n    ${0:}\n}\n',
		},
		{
			id: 'try',
			label: 'Try-Catch',
			insert: 'try\n{\n    ${1:}\n}\ncatch (${2:Exception} ${3:ex})\n{\n    ${0:}\n}\n',
		},
		{
			id: 'switch',
			label: 'Switch',
			insert: 'switch (${1:variable})\n{\n    case ${2:value}:\n        ${3:}\n        break;\n    default:\n        ${0:}\n        break;\n}\n',
		},
	],

	// JavaScript
	js: [
		{
			id: 'func',
			label: 'Function',
			insert: 'function ${1:functionName}(${2:args}) {\n  ${0:}\n}\n',
		},
		{
			id: 'arrow',
			label: 'Arrow Func',
			insert: 'const ${1:name} = (${2:args}) => {\n  ${0:}\n};\n',
		},
		{
			id: 'arrowshort',
			label: 'Arrow Short',
			insert: 'const ${1:name} = (${2:args}) => ${0:};\n',
		},
		{
			id: 'class',
			label: 'Class',
			insert: 'class ${1:ClassName} {\n  constructor(${2:args}) {\n    ${0:}\n  }\n}\n',
		},
		{
			id: 'method',
			label: 'Method',
			insert: '${1:methodName}(${2:args}) {\n  ${0:}\n}\n',
		},
		{
			id: 'if',
			label: 'If',
			insert: 'if (${1:condition}) {\n  ${0:}\n}\n',
		},
		{
			id: 'else',
			label: 'If-Else',
			insert: 'if (${1:condition}) {\n  ${2:}\n} else {\n  ${0:}\n}\n',
		},
		{
			id: 'for',
			label: 'For Loop',
			insert: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n  ${0:}\n}\n',
		},
		{
			id: 'foreach',
			label: 'ForEach',
			insert: '${1:array}.forEach((${2:item}) => {\n  ${0:}\n});\n',
		},
		{
			id: 'map',
			label: 'Map',
			insert: '${1:array}.map((${2:item}) => ${0:item});\n',
		},
		{
			id: 'filter',
			label: 'Filter',
			insert: '${1:array}.filter((${2:item}) => ${0:condition});\n',
		},
		{
			id: 'reduce',
			label: 'Reduce',
			insert: '${1:array}.reduce((${2:acc}, ${3:item}) => {\n  ${0:return acc;}\n}, ${4:initialValue});\n',
		},
		{
			id: 'trycatch',
			label: 'Try-Catch',
			insert: 'try {\n  ${1:}\n} catch (${2:error}) {\n  ${0:}\n}\n',
		},
		{
			id: 'promise',
			label: 'Promise',
			insert: 'new Promise((resolve, reject) => {\n  ${0:}\n});\n',
		},
		{
			id: 'async',
			label: 'Async Func',
			insert: 'async function ${1:functionName}(${2:args}) {\n  ${0:}\n}\n',
		},
		{
			id: 'asyncarrow',
			label: 'Async Arrow',
			insert: 'const ${1:name} = async (${2:args}) => {\n  ${0:}\n};\n',
		},
		{
			id: 'import',
			label: 'Import',
			insert: "import ${1:module} from '${2:./module}';\n${0:}",
		},
		{
			id: 'export',
			label: 'Export',
			insert: 'export ${1:default} ${0:};\n',
		},
	],

	// TypeScript
	ts: [
		{
			id: 'func',
			label: 'Function',
			insert: 'function ${1:functionName}(${2:args}): ${3:void} {\n  ${0:}\n}\n',
		},
		{
			id: 'arrow',
			label: 'Arrow Func',
			insert: 'const ${1:name} = (${2:args}): ${3:void} => {\n  ${0:}\n};\n',
		},
		{
			id: 'interface',
			label: 'Interface',
			insert: 'interface ${1:InterfaceName} {\n  ${2:property}: ${3:type};\n  ${0:}\n}\n',
		},
		{
			id: 'type',
			label: 'Type Alias',
			insert: 'type ${1:TypeName} = ${0:};\n',
		},
		{
			id: 'enum',
			label: 'Enum',
			insert: 'enum ${1:EnumName} {\n  ${2:Value1},\n  ${3:Value2},\n  ${0:}\n}\n',
		},
		{
			id: 'class',
			label: 'Class',
			insert: 'class ${1:ClassName} {\n  constructor(${2:args}) {\n    ${0:}\n  }\n}\n',
		},
		{ id: 'generic', label: 'Generic Type', insert: '<${1:T}>${0:}' },
		{
			id: 'async',
			label: 'Async Func',
			insert: 'async function ${1:functionName}(${2:args}): Promise<${3:void}> {\n  ${0:}\n}\n',
		},
		{
			id: 'asyncarrow',
			label: 'Async Arrow',
			insert: 'const ${1:name} = async (${2:args}): Promise<${3:void}> => {\n  ${0:}\n};\n',
		},
		{
			id: 'import',
			label: 'Import',
			insert: "import { ${1:module} } from '${2:./module}';\n${0:}",
		},
		{
			id: 'importtype',
			label: 'Import Type',
			insert: "import type { ${1:Type} } from '${2:./types}';\n${0:}",
		},
		{
			id: 'export',
			label: 'Export',
			insert: 'export ${1:const} ${2:name}${0:};\n',
		},
	],

	// HTML
	html: [
		{
			id: 'div',
			label: 'Div',
			insert: '<div class="${1:}">\n  ${0:}\n</div>\n',
		},
		{
			id: 'span',
			label: 'Span',
			insert: '<span class="${1:}">${0:}</span>\n',
		},
		{ id: 'p', label: 'Paragraph', insert: '<p>${0:}</p>\n' },
		{ id: 'h1', label: 'H1', insert: '<h1>${0:Heading}</h1>\n' },
		{ id: 'h2', label: 'H2', insert: '<h2>${0:Heading}</h2>\n' },
		{
			id: 'a',
			label: 'Link',
			insert: '<a href="${1:https://example.com}">${0:Link text}</a>\n',
		},
		{
			id: 'img',
			label: 'Image',
			insert: '<img src="${1:image.jpg}" alt="${2:description}" />${0:}\n',
		},
		{
			id: 'button',
			label: 'Button',
			insert: '<button type="${1:button}" class="${2:}">${0:Click me}</button>\n',
		},
		{
			id: 'input',
			label: 'Input',
			insert: '<input type="${1:text}" name="${2:}" placeholder="${3:}" />${0:}\n',
		},
		{
			id: 'textarea',
			label: 'Textarea',
			insert: '<textarea name="${1:}" rows="${2:4}" cols="${3:50}">${0:}</textarea>\n',
		},
		{
			id: 'select',
			label: 'Select',
			insert: '<select name="${1:}">\n  <option value="${2:}">${3:Option}</option>\n  ${0:}\n</select>\n',
		},
		{
			id: 'form',
			label: 'Form',
			insert: '<form action="${1:/submit}" method="${2:post}">\n  ${0:}\n</form>\n',
		},
		{
			id: 'ul',
			label: 'UL List',
			insert: '<ul>\n  <li>${1:Item 1}</li>\n  <li>${2:Item 2}</li>\n  <li>${3:Item 3}</li>\n  ${0:}\n</ul>\n',
		},
		{
			id: 'ol',
			label: 'OL List',
			insert: '<ol>\n  <li>${1:Item 1}</li>\n  <li>${2:Item 2}</li>\n  <li>${3:Item 3}</li>\n  ${0:}\n</ol>\n',
		},
		{
			id: 'table',
			label: 'Table',
			insert: '<table>\n  <thead>\n    <tr>\n      <th>${1:Header 1}</th>\n      <th>${2:Header 2}</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>${3:Data 1}</td>\n      <td>${4:Data 2}</td>\n    </tr>\n    ${0:}\n  </tbody>\n</table>\n',
		},
		{
			id: 'script',
			label: 'Script',
			insert: '<script src="${1:script.js}"></script>${0:}\n',
		},
		{
			id: 'link',
			label: 'Link CSS',
			insert: '<link rel="stylesheet" href="${1:style.css}" />${0:}\n',
		},
		{
			id: 'meta',
			label: 'Meta',
			insert: '<meta name="${1:description}" content="${2:}" />${0:}\n',
		},
	],
	htm: [
		{
			id: 'div',
			label: 'Div',
			insert: '<div class="${1:}">\n  ${0:}\n</div>\n',
		},
		{
			id: 'span',
			label: 'Span',
			insert: '<span class="${1:}">${0:}</span>\n',
		},
		{ id: 'p', label: 'Paragraph', insert: '<p>${0:}</p>\n' },
		{ id: 'h1', label: 'H1', insert: '<h1>${0:Heading}</h1>\n' },
		{ id: 'h2', label: 'H2', insert: '<h2>${0:Heading}</h2>\n' },
		{
			id: 'a',
			label: 'Link',
			insert: '<a href="${1:https://example.com}">${0:Link text}</a>\n',
		},
		{
			id: 'img',
			label: 'Image',
			insert: '<img src="${1:image.jpg}" alt="${2:description}" />${0:}\n',
		},
		{
			id: 'button',
			label: 'Button',
			insert: '<button type="${1:button}" class="${2:}">${0:Click me}</button>\n',
		},
		{
			id: 'input',
			label: 'Input',
			insert: '<input type="${1:text}" name="${2:}" placeholder="${3:}" />${0:}\n',
		},
		{
			id: 'textarea',
			label: 'Textarea',
			insert: '<textarea name="${1:}" rows="${2:4}" cols="${3:50}">${0:}</textarea>\n',
		},
		{
			id: 'select',
			label: 'Select',
			insert: '<select name="${1:}">\n  <option value="${2:}">${3:Option}</option>\n  ${0:}\n</select>\n',
		},
		{
			id: 'form',
			label: 'Form',
			insert: '<form action="${1:/submit}" method="${2:post}">\n  ${0:}\n</form>\n',
		},
		{
			id: 'ul',
			label: 'UL List',
			insert: '<ul>\n  <li>${1:Item 1}</li>\n  <li>${2:Item 2}</li>\n  <li>${3:Item 3}</li>\n  ${0:}\n</ul>\n',
		},
		{
			id: 'ol',
			label: 'OL List',
			insert: '<ol>\n  <li>${1:Item 1}</li>\n  <li>${2:Item 2}</li>\n  <li>${3:Item 3}</li>\n  ${0:}\n</ol>\n',
		},
		{
			id: 'table',
			label: 'Table',
			insert: '<table>\n  <thead>\n    <tr>\n      <th>${1:Header 1}</th>\n      <th>${2:Header 2}</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>${3:Data 1}</td>\n      <td>${4:Data 2}</td>\n    </tr>\n    ${0:}\n  </tbody>\n</table>\n',
		},
		{
			id: 'script',
			label: 'Script',
			insert: '<script src="${1:script.js}"></script>${0:}\n',
		},
		{
			id: 'link',
			label: 'Link CSS',
			insert: '<link rel="stylesheet" href="${1:style.css}" />${0:}\n',
		},
		{
			id: 'meta',
			label: 'Meta',
			insert: '<meta name="${1:description}" content="${2:}" />${0:}\n',
		},
	],

	// CSS
	css: [
		{
			id: 'class',
			label: 'Class',
			insert: '.${1:class-name} {\n  ${0:}\n}\n',
		},
		{ id: 'id', label: 'ID', insert: '#${1:id-name} {\n  ${0:}\n}\n' },
		{ id: 'element', label: 'Element', insert: '${1:div} {\n  ${0:}\n}\n' },
		{
			id: 'flexbox',
			label: 'Flexbox',
			insert: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};\n${0:}',
		},
		{
			id: 'grid',
			label: 'Grid',
			insert: 'display: grid;\ngrid-template-columns: ${1:repeat(3, 1fr)};\ngap: ${2:1rem};\n${0:}',
		},
		{
			id: 'media',
			label: 'Media Query',
			insert: '@media (${1:min-width}: ${2:768px}) {\n  ${0:}\n}\n',
		},
		{
			id: 'keyframes',
			label: 'Keyframes',
			insert: '@keyframes ${1:animationName} {\n  0% {\n    ${2:}\n  }\n  100% {\n    ${0:}\n  }\n}\n',
		},
		{
			id: 'import',
			label: 'Import',
			insert: "@import url('${1:style.css}');\n${0:}",
		},
		{
			id: 'font',
			label: 'Font Face',
			insert: "@font-face {\n  font-family: '${1:FontName}';\n  src: url('${2:font.woff2}') format('woff2');\n  ${0:}\n}\n",
		},
		{
			id: 'transition',
			label: 'Transition',
			insert: 'transition: ${1:all} ${2:0.3s} ${3:ease};\n${0:}',
		},
		{
			id: 'transform',
			label: 'Transform',
			insert: 'transform: ${1:translateX(0)};\n${0:}',
		},
		{
			id: 'pseudo',
			label: 'Pseudo Class',
			insert: '${1:&}:${2:hover} {\n  ${0:}\n}\n',
		},
	],

	// Java
	java: [
		{
			id: 'class',
			label: 'Class',
			insert: 'public class ${1:ClassName} {\n    ${0:}\n}\n',
		},
		{
			id: 'method',
			label: 'Method',
			insert: 'public ${1:void} ${2:methodName}(${3:args}) {\n    ${0:}\n}\n',
		},
		{
			id: 'main',
			label: 'Main',
			insert: 'public static void main(String[] args) {\n    ${0:}\n}\n',
		},
		{
			id: 'if',
			label: 'If',
			insert: 'if (${1:condition}) {\n    ${0:}\n}\n',
		},
		{
			id: 'for',
			label: 'For Loop',
			insert: 'for (int ${1:i} = 0; ${1:i} < ${2:count}; ${1:i}++) {\n    ${0:}\n}\n',
		},
		{
			id: 'foreach',
			label: 'For-Each',
			insert: 'for (${1:Type} ${2:item} : ${3:collection}) {\n    ${0:}\n}\n',
		},
		{
			id: 'while',
			label: 'While',
			insert: 'while (${1:condition}) {\n    ${0:}\n}\n',
		},
		{
			id: 'try',
			label: 'Try-Catch',
			insert: 'try {\n    ${1:}\n} catch (${2:Exception} ${3:e}) {\n    ${0:}\n}\n',
		},
		{
			id: 'switch',
			label: 'Switch',
			insert: 'switch (${1:variable}) {\n    case ${2:value}:\n        ${3:}\n        break;\n    default:\n        ${0:}\n        break;\n}\n',
		},
		{
			id: 'interface',
			label: 'Interface',
			insert: 'public interface ${1:InterfaceName} {\n    ${0:}\n}\n',
		},
	],

	// C
	c: [
		{
			id: 'func',
			label: 'Function',
			insert: '${1:void} ${2:functionName}(${3:args}) {\n    ${0:}\n}\n',
		},
		{
			id: 'main',
			label: 'Main',
			insert: 'int main() {\n    ${0:}\n    return 0;\n}\n',
		},
		{
			id: 'struct',
			label: 'Struct',
			insert: 'struct ${1:Name} {\n    ${0:}\n};\n',
		},
		{
			id: 'if',
			label: 'If',
			insert: 'if (${1:condition}) {\n    ${0:}\n}\n',
		},
		{
			id: 'for',
			label: 'For Loop',
			insert: 'for (int ${1:i} = 0; ${1:i} < ${2:count}; ${1:i}++) {\n    ${0:}\n}\n',
		},
		{
			id: 'while',
			label: 'While',
			insert: 'while (${1:condition}) {\n    ${0:}\n}\n',
		},
		{
			id: 'switch',
			label: 'Switch',
			insert: 'switch (${1:variable}) {\n    case ${2:value}:\n        ${3:}\n        break;\n    default:\n        ${0:}\n        break;\n}\n',
		},
		{
			id: 'include',
			label: 'Include',
			insert: '#include <${1:stdio.h}>\n${0:}',
		},
		{
			id: 'define',
			label: 'Define',
			insert: '#define ${1:NAME} ${0:value}\n',
		},
	],

	// C++
	cpp: [
		{
			id: 'func',
			label: 'Function',
			insert: '${1:void} ${2:functionName}(${3:args}) {\n    ${0:}\n}\n',
		},
		{
			id: 'class',
			label: 'Class',
			insert: 'class ${1:ClassName} {\npublic:\n    ${1:ClassName}();\n    ~${1:ClassName}();\n    ${0:}\nprivate:\n    \n};\n',
		},
		{
			id: 'main',
			label: 'Main',
			insert: 'int main() {\n    ${0:}\n    return 0;\n}\n',
		},
		{
			id: 'namespace',
			label: 'Namespace',
			insert: 'namespace ${1:name} {\n    ${0:}\n}\n',
		},
		{
			id: 'for',
			label: 'For Loop',
			insert: 'for (int ${1:i} = 0; ${1:i} < ${2:count}; ${1:i}++) {\n    ${0:}\n}\n',
		},
		{
			id: 'foreach',
			label: 'Range For',
			insert: 'for (auto& ${1:item} : ${2:container}) {\n    ${0:}\n}\n',
		},
		{
			id: 'template',
			label: 'Template',
			insert: 'template<typename ${1:T}>\n${0:}',
		},
		{
			id: 'include',
			label: 'Include',
			insert: '#include <${1:iostream}>\n${0:}',
		},
		{
			id: 'vector',
			label: 'Vector',
			insert: 'std::vector<${1:int}> ${2:vec}${0:};\n',
		},
	],

	// Go
	go: [
		{
			id: 'func',
			label: 'Function',
			insert: 'func ${1:functionName}(${2:args}) ${3:returnType} {\n\t${0:}\n}\n',
		},
		{
			id: 'struct',
			label: 'Struct',
			insert: 'type ${1:StructName} struct {\n\t${2:Field} ${3:type}\n\t${0:}\n}\n',
		},
		{
			id: 'interface',
			label: 'Interface',
			insert: 'type ${1:InterfaceName} interface {\n\t${2:Method}(${3:args}) ${4:returnType}\n\t${0:}\n}\n',
		},
		{ id: 'main', label: 'Main', insert: 'func main() {\n\t${0:}\n}\n' },
		{ id: 'if', label: 'If', insert: 'if ${1:condition} {\n\t${0:}\n}\n' },
		{
			id: 'for',
			label: 'For Loop',
			insert: 'for ${1:i} := 0; ${1:i} < ${2:count}; ${1:i}++ {\n\t${0:}\n}\n',
		},
		{
			id: 'range',
			label: 'For Range',
			insert: 'for ${1:key}, ${2:value} := range ${3:collection} {\n\t${0:}\n}\n',
		},
		{ id: 'defer', label: 'Defer', insert: 'defer ${0:}' },
		{ id: 'go', label: 'Goroutine', insert: 'go func() {\n\t${0:}\n}()\n' },
		{
			id: 'chan',
			label: 'Channel',
			insert: 'ch := make(chan ${1:int})${0:}\n',
		},
	],

	// Rust
	rs: [
		{
			id: 'fn',
			label: 'Function',
			insert: 'fn ${1:function_name}(${2:args}) -> ${3:ReturnType} {\n    ${0:}\n}\n',
		},
		{
			id: 'struct',
			label: 'Struct',
			insert: 'struct ${1:StructName} {\n    ${2:field}: ${3:Type},\n    ${0:}\n}\n',
		},
		{
			id: 'enum',
			label: 'Enum',
			insert: 'enum ${1:EnumName} {\n    ${2:Variant1},\n    ${3:Variant2},\n    ${0:}\n}\n',
		},
		{
			id: 'impl',
			label: 'Impl',
			insert: 'impl ${1:StructName} {\n    ${0:}\n}\n',
		},
		{ id: 'main', label: 'Main', insert: 'fn main() {\n    ${0:}\n}\n' },
		{
			id: 'if',
			label: 'If',
			insert: 'if ${1:condition} {\n    ${0:}\n}\n',
		},
		{
			id: 'match',
			label: 'Match',
			insert: 'match ${1:value} {\n    ${2:pattern} => ${3:result},\n    _ => ${0:default},\n}\n',
		},
		{ id: 'loop', label: 'Loop', insert: 'loop {\n    ${0:}\n}\n' },
		{
			id: 'for',
			label: 'For Loop',
			insert: 'for ${1:item} in ${2:collection} {\n    ${0:}\n}\n',
		},
		{
			id: 'trait',
			label: 'Trait',
			insert: 'trait ${1:TraitName} {\n    ${0:}\n}\n',
		},
	],

	// PHP
	php: [
		{
			id: 'func',
			label: 'Function',
			insert: 'function ${1:functionName}(${2:$args}) {\n    ${0:}\n}\n',
		},
		{
			id: 'class',
			label: 'Class',
			insert: 'class ${1:ClassName} {\n    public function __construct(${2:$args}) {\n        ${0:}\n    }\n}\n',
		},
		{
			id: 'method',
			label: 'Method',
			insert: 'public function ${1:methodName}(${2:$args}) {\n    ${0:}\n}\n',
		},
		{ id: 'echo', label: 'Echo', insert: 'echo ${1:"text"};${0:}\n' },
		{
			id: 'if',
			label: 'If',
			insert: 'if (${1:condition}) {\n    ${0:}\n}\n',
		},
		{
			id: 'foreach',
			label: 'ForEach',
			insert: 'foreach (${1:$array} as ${2:$item}) {\n    ${0:}\n}\n',
		},
		{
			id: 'while',
			label: 'While',
			insert: 'while (${1:condition}) {\n    ${0:}\n}\n',
		},
		{
			id: 'try',
			label: 'Try-Catch',
			insert: 'try {\n    ${1:}\n} catch (${2:Exception} ${3:$e}) {\n    ${0:}\n}\n',
		},
		{
			id: 'namespace',
			label: 'Namespace',
			insert: 'namespace ${1:Name};\n\n${0:}',
		},
		{ id: 'use', label: 'Use', insert: 'use ${1:ClassName};\n${0:}' },
	],

	// Ruby
	rb: [
		{
			id: 'def',
			label: 'Method',
			insert: 'def ${1:method_name}(${2:args})\n  ${0:}\nend\n',
		},
		{
			id: 'class',
			label: 'Class',
			insert: 'class ${1:ClassName}\n  def initialize(${2:args})\n    ${0:}\n  end\nend\n',
		},
		{
			id: 'module',
			label: 'Module',
			insert: 'module ${1:ModuleName}\n  ${0:}\nend\n',
		},
		{ id: 'if', label: 'If', insert: 'if ${1:condition}\n  ${0:}\nend\n' },
		{
			id: 'unless',
			label: 'Unless',
			insert: 'unless ${1:condition}\n  ${0:}\nend\n',
		},
		{
			id: 'each',
			label: 'Each',
			insert: '${1:array}.each do |${2:item}|\n  ${0:}\nend\n',
		},
		{
			id: 'map',
			label: 'Map',
			insert: '${1:array}.map do |${2:item}|\n  ${0:}\nend\n',
		},
		{
			id: 'select',
			label: 'Select',
			insert: '${1:array}.select do |${2:item}|\n  ${0:}\nend\n',
		},
		{
			id: 'case',
			label: 'Case',
			insert: 'case ${1:variable}\nwhen ${2:value}\n  ${3:}\nelse\n  ${0:}\nend\n',
		},
		{
			id: 'lambda',
			label: 'Lambda',
			insert: 'lambda { |${1:args}| ${0:} }\n',
		},
	],

	// SQL
	sql: [
		{
			id: 'select',
			label: 'SELECT',
			insert: 'SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:condition};${0:}\n',
		},
		{
			id: 'insert',
			label: 'INSERT',
			insert: 'INSERT INTO ${1:table} (${2:column1}, ${3:column2})\nVALUES (${4:value1}, ${5:value2});${0:}\n',
		},
		{
			id: 'update',
			label: 'UPDATE',
			insert: 'UPDATE ${1:table}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition};${0:}\n',
		},
		{
			id: 'delete',
			label: 'DELETE',
			insert: 'DELETE FROM ${1:table}\nWHERE ${2:condition};${0:}\n',
		},
		{
			id: 'join',
			label: 'JOIN',
			insert: 'SELECT ${1:*}\nFROM ${2:table1}\nJOIN ${3:table2} ON ${2:table1}.${4:id} = ${3:table2}.${5:foreign_id}\nWHERE ${6:condition};${0:}\n',
		},
		{
			id: 'create',
			label: 'CREATE TABLE',
			insert: 'CREATE TABLE ${1:table_name} (\n    ${2:id} INT PRIMARY KEY AUTO_INCREMENT,\n    ${3:column} ${4:VARCHAR(255)},\n    ${0:}\n);\n',
		},
		{
			id: 'alter',
			label: 'ALTER TABLE',
			insert: 'ALTER TABLE ${1:table}\nADD ${2:column} ${3:datatype};${0:}\n',
		},
		{
			id: 'drop',
			label: 'DROP TABLE',
			insert: 'DROP TABLE ${1:table};${0:}\n',
		},
		{
			id: 'groupby',
			label: 'GROUP BY',
			insert: 'SELECT ${1:column}, COUNT(*)\nFROM ${2:table}\nGROUP BY ${1:column}\nHAVING COUNT(*) > ${3:1};${0:}\n',
		},
	],

	// Shell/Bash
	sh: [
		{
			id: 'func',
			label: 'Function',
			insert: '${1:function_name}() {\n    ${0:}\n}\n',
		},
		{
			id: 'if',
			label: 'If',
			insert: 'if [ ${1:condition} ]; then\n    ${0:}\nfi\n',
		},
		{
			id: 'elif',
			label: 'If-Elif',
			insert: 'if [ ${1:condition} ]; then\n    ${2:}\nelif [ ${3:condition} ]; then\n    ${4:}\nelse\n    ${0:}\nfi\n',
		},
		{
			id: 'for',
			label: 'For Loop',
			insert: 'for ${1:item} in ${2:list}; do\n    ${0:}\ndone\n',
		},
		{
			id: 'while',
			label: 'While',
			insert: 'while [ ${1:condition} ]; do\n    ${0:}\ndone\n',
		},
		{
			id: 'case',
			label: 'Case',
			insert: 'case ${1:$variable} in\n    ${2:pattern})\n        ${3:}\n        ;;\n    *)\n        ${0:}\n        ;;\nesac\n',
		},
		{
			id: 'var',
			label: 'Variable',
			insert: '${1:VAR}="${2:value}"${0:}\n',
		},
		{
			id: 'array',
			label: 'Array',
			insert: '${1:array}=(${2:item1} ${3:item2} ${4:item3})${0:}\n',
		},
	],
	bash: [
		{
			id: 'func',
			label: 'Function',
			insert: '${1:function_name}() {\n    ${0:}\n}\n',
		},
		{
			id: 'if',
			label: 'If',
			insert: 'if [ ${1:condition} ]; then\n    ${0:}\nfi\n',
		},
		{
			id: 'elif',
			label: 'If-Elif',
			insert: 'if [ ${1:condition} ]; then\n    ${2:}\nelif [ ${3:condition} ]; then\n    ${4:}\nelse\n    ${0:}\nfi\n',
		},
		{
			id: 'for',
			label: 'For Loop',
			insert: 'for ${1:item} in ${2:list}; do\n    ${0:}\ndone\n',
		},
		{
			id: 'while',
			label: 'While',
			insert: 'while [ ${1:condition} ]; do\n    ${0:}\ndone\n',
		},
		{
			id: 'case',
			label: 'Case',
			insert: 'case ${1:$variable} in\n    ${2:pattern})\n        ${3:}\n        ;;\n    *)\n        ${0:}\n        ;;\nesac\n',
		},
		{
			id: 'var',
			label: 'Variable',
			insert: '${1:VAR}="${2:value}"${0:}\n',
		},
		{
			id: 'array',
			label: 'Array',
			insert: '${1:array}=(${2:item1} ${3:item2} ${4:item3})${0:}\n',
		},
	],

	// JSX/React
	jsx: [
		{
			id: 'comp',
			label: 'Component',
			insert: 'function ${1:Component}() {\n  return (\n    <div>\n      ${0:}\n    </div>\n  );\n}\n',
		},
		{
			id: 'compprops',
			label: 'Component Props',
			insert: 'function ${1:Component}({ ${2:props} }) {\n  return (\n    <div>\n      ${0:}\n    </div>\n  );\n}\n',
		},
		{
			id: 'useState',
			label: 'useState',
			insert: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});${0:}\n',
		},
		{
			id: 'useEffect',
			label: 'useEffect',
			insert: 'useEffect(() => {\n  ${1:}\n  return () => {\n    ${2:cleanup}\n  };\n}, [${0:dependencies}]);\n',
		},
		{
			id: 'useContext',
			label: 'useContext',
			insert: 'const ${1:value} = useContext(${2:Context});${0:}\n',
		},
		{
			id: 'useRef',
			label: 'useRef',
			insert: 'const ${1:ref} = useRef(${2:null});${0:}\n',
		},
		{
			id: 'useMemo',
			label: 'useMemo',
			insert: 'const ${1:value} = useMemo(() => ${2:computation}, [${0:dependencies}]);\n',
		},
		{
			id: 'useCallback',
			label: 'useCallback',
			insert: 'const ${1:callback} = useCallback(() => {\n  ${2:}\n}, [${0:dependencies}]);\n',
		},
		{
			id: 'map',
			label: 'Map JSX',
			insert: '{${1:array}.map((${2:item}) => (\n  <div key={${3:item.id}}>\n    ${0:}\n  </div>\n))}\n',
		},
	],
	tsx: [
		{
			id: 'comp',
			label: 'Component',
			insert: 'function ${1:Component}() {\n  return (\n    <div>\n      ${0:}\n    </div>\n  );\n}\n',
		},
		{
			id: 'compprops',
			label: 'Component Props',
			insert: 'interface ${1:Component}Props {\n  ${2:prop}: ${3:type};\n}\n\nfunction ${1:Component}({ ${2:prop} }: ${1:Component}Props) {\n  return (\n    <div>\n      ${0:}\n    </div>\n  );\n}\n',
		},
		{
			id: 'useState',
			label: 'useState',
			insert: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:Type}>(${3:initialValue});${0:}\n',
		},
		{
			id: 'useEffect',
			label: 'useEffect',
			insert: 'useEffect(() => {\n  ${1:}\n  return () => {\n    ${2:cleanup}\n  };\n}, [${0:dependencies}]);\n',
		},
		{
			id: 'useContext',
			label: 'useContext',
			insert: 'const ${1:value} = useContext(${2:Context});${0:}\n',
		},
		{
			id: 'useRef',
			label: 'useRef',
			insert: 'const ${1:ref} = useRef<${2:Type}>(${3:null});${0:}\n',
		},
		{
			id: 'useMemo',
			label: 'useMemo',
			insert: 'const ${1:value} = useMemo(() => ${2:computation}, [${0:dependencies}]);\n',
		},
		{
			id: 'useCallback',
			label: 'useCallback',
			insert: 'const ${1:callback} = useCallback(() => {\n  ${2:}\n}, [${0:dependencies}]);\n',
		},
		{
			id: 'map',
			label: 'Map JSX',
			insert: '{${1:array}.map((${2:item}) => (\n  <div key={${3:item.id}}>\n    ${0:}\n  </div>\n))}\n',
		},
	],

	// JSON
	json: [
		{
			id: 'obj',
			label: 'Object',
			insert: '{\n  "${1:key}": ${2:"value"}${0:}\n}\n',
		},
		{ id: 'arr', label: 'Array', insert: '[\n  ${0:}\n]\n' },
		{
			id: 'string',
			label: 'String',
			insert: '"${1:key}": "${2:value}"${0:}',
		},
		{ id: 'number', label: 'Number', insert: '"${1:key}": ${2:0}${0:}' },
		{ id: 'bool', label: 'Boolean', insert: '"${1:key}": ${2:true}${0:}' },
		{ id: 'null', label: 'Null', insert: '"${1:key}": null${0:}' },
	],
};
