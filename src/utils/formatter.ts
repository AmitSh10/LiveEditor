import prettier from 'prettier';
import htmlParser from 'prettier/plugins/html';
import cssParser from 'prettier/plugins/postcss';
import babelParser from 'prettier/plugins/babel';
import estreeParser from 'prettier/plugins/estree';
import markdownParser from 'prettier/plugins/markdown';

/**
 * Format code using Prettier based on file extension
 */
export async function formatCode(
	code: string,
	extension: string
): Promise<string> {
	try {
		const parser = getParserForExtension(extension);
		if (!parser) {
			console.warn(
				`Formatting not supported for .${extension} files. Supported: HTML, CSS, JS, TS, JSON, Markdown`
			);
			return code;
		}

		const plugins = getPluginsForParser(parser);

		const formatted = await prettier.format(code, {
			parser,
			plugins,
			tabWidth: 2,
			useTabs: true,
			semi: true,
			singleQuote: true,
			trailingComma: 'es5',
			bracketSpacing: true,
			arrowParens: 'always',
			printWidth: 80,
			endOfLine: 'lf',
		});

		return formatted;
	} catch (error) {
		console.error('Formatting error:', error);
		return code;
	}
}

function getParserForExtension(extension: string): string | null {
	const parserMap: Record<string, string> = {
		html: 'html',
		htm: 'html',
		css: 'css',
		scss: 'scss',
		less: 'less',
		js: 'babel',
		jsx: 'babel',
		ts: 'typescript',
		tsx: 'typescript',
		json: 'json',
		md: 'markdown',
		markdown: 'markdown',
	};

	return parserMap[extension.toLowerCase()] || null;
}

function getPluginsForParser(parser: string) {
	switch (parser) {
		case 'html':
			return [htmlParser];
		case 'css':
		case 'scss':
		case 'less':
			return [cssParser];
		case 'babel':
		case 'typescript':
			return [babelParser, estreeParser];
		case 'json':
			return [babelParser, estreeParser];
		case 'markdown':
			return [markdownParser];
		default:
			return [];
	}
}
