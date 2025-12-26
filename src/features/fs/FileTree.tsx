import type { FSNode } from '../../types/fs';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setActiveFile } from './fsSlice';

function Node({ node }: { node: FSNode }) {
	const dispatch = useAppDispatch();
	const activeId = useAppSelector((s) => s.fs.activeFileId);

	if (node.type === 'folder') {
		return (
			<div className="ml-2">
				<div className="text-slate-300 font-medium">{node.name}</div>
				<div className="ml-2">
					{node.children.map((c) => (
						<Node
							key={c.id}
							node={c}
						/>
					))}
				</div>
			</div>
		);
	}

	const isActive = node.id === activeId;

	return (
		<div
			onClick={() => dispatch(setActiveFile(node.id))}
			className={`cursor-pointer px-2 py-1 rounded text-sm
        ${
			isActive
				? 'bg-slate-800 text-white'
				: 'text-slate-400 hover:bg-slate-900'
		}
      `}
		>
			{node.name}
		</div>
	);
}

export function FileTree() {
	const root = useAppSelector((s) => s.fs.root);
	return <Node node={root} />;
}
