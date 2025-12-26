export type Placeholder = {
	n: number;
	start: number;
	end: number;
};

export function parseSnippet(template: string): {
	text: string;
	placeholders: Placeholder[];
} {
	/**
	 * Supported:
	 * ${1:name}
	 * ${2:url}
	 * ${0:}  -> explicit final caret position
	 */
	const re = /\$\{(\d+):([^}]*)\}/g;

	let out = '';
	let lastIdx = 0;
	const placeholders: Placeholder[] = [];

	for (const m of template.matchAll(re)) {
		const idx = m.index ?? 0;
		const n = Number(m[1]);
		const def = m[2] ?? '';

		out += template.slice(lastIdx, idx);

		const start = out.length;
		out += def;
		const end = out.length;

		placeholders.push({ n, start, end });
		lastIdx = idx + m[0].length;
	}

	out += template.slice(lastIdx);

	/**
	 * Sort placeholders:
	 * 1..N first
	 * 0 LAST (final caret)
	 */
	placeholders.sort((a, b) => {
		if (a.n === 0 && b.n !== 0) return 1;
		if (b.n === 0 && a.n !== 0) return -1;
		return a.n - b.n;
	});

	return { text: out, placeholders };
}
