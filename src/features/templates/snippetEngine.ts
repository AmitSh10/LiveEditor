export type Placeholder = { n: number; start: number; end: number };

export function parseSnippet(template: string): {
	text: string;
	placeholders: Placeholder[];
} {
	const re = /\$\{(\d+):([^}]+)\}/g;

	let out = '';
	let lastIdx = 0;
	const placeholders: Placeholder[] = [];

	for (const m of template.matchAll(re)) {
		const idx = m.index ?? 0;
		const n = Number(m[1]);
		const def = m[2];

		out += template.slice(lastIdx, idx);

		const start = out.length;
		out += def;
		const end = out.length;

		placeholders.push({ n, start, end });
		lastIdx = idx + m[0].length;
	}

	out += template.slice(lastIdx);

	placeholders.sort((a, b) => a.n - b.n);
	return { text: out, placeholders };
}
