import { useState, useRef, useEffect } from 'react';

type HexViewerProps = {
	content: string;
	fileName: string;
};

export function HexViewer({ content, fileName }: HexViewerProps) {
	const [bytesPerRow, setBytesPerRow] = useState(16);
	const [displayMode, setDisplayMode] = useState<'hex' | 'binary'>('hex');
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [selectedStart, setSelectedStart] = useState<number | null>(null);
	const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
	const [isSelecting, setIsSelecting] = useState(false);

	// Convert content to UTF-8 bytes
	const bytes: number[] = [];
	const encoder = new TextEncoder();
	const utf8Bytes = encoder.encode(content);
	for (let i = 0; i < utf8Bytes.length; i++) {
		bytes.push(utf8Bytes[i]);
	}

	// Group bytes into rows
	const rows: number[][] = [];
	for (let i = 0; i < bytes.length; i += bytesPerRow) {
		rows.push(bytes.slice(i, i + bytesPerRow));
	}

	// Convert byte to hex string
	const toHex = (byte: number) => byte.toString(16).toUpperCase().padStart(2, '0');

	// Convert byte to binary string
	const toBinary = (byte: number) => byte.toString(2).padStart(8, '0');

	// Convert byte to printable ASCII char (for bytes 0-127 only)
	// UTF-8 multi-byte sequences will show as dots
	const toAscii = (byte: number) => {
		// Only display standard ASCII printable characters
		if (byte >= 32 && byte <= 126) {
			return String.fromCharCode(byte);
		}
		return '.';
	};

	// Check if index is selected
	const isSelected = (index: number) => {
		if (selectedStart === null || selectedEnd === null) return false;
		const min = Math.min(selectedStart, selectedEnd);
		const max = Math.max(selectedStart, selectedEnd);
		return index >= min && index <= max;
	};

	// Handle mouse down on byte
	const handleMouseDown = (index: number) => {
		setSelectedStart(index);
		setSelectedEnd(index);
		setIsSelecting(true);
	};

	// Handle mouse enter while selecting
	const handleMouseEnter = (index: number) => {
		if (isSelecting) {
			setSelectedEnd(index);
		}
	};

	// Handle mouse up - end selection
	useEffect(() => {
		const handleMouseUp = () => {
			setIsSelecting(false);
		};

		document.addEventListener('mouseup', handleMouseUp);
		return () => document.removeEventListener('mouseup', handleMouseUp);
	}, []);

	return (
		<div className="h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-mono text-sm">
			<div className="mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 px-4 pt-4 shrink-0">
				<div className="flex items-center justify-between mb-2">
					<div className="text-lg font-semibold">Hex Viewer: {fileName}</div>
					<div className="flex items-center gap-3">
						{/* Display mode toggle */}
						<div className="flex items-center gap-2">
							<label className="text-xs text-slate-600 dark:text-slate-400">Display:</label>
							<select
								className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
								value={displayMode}
								onChange={(e) => setDisplayMode(e.target.value as 'hex' | 'binary')}
							>
								<option value="hex">Hexadecimal</option>
								<option value="binary">Binary</option>
							</select>
						</div>

						{/* Bytes per row selector */}
						<div className="flex items-center gap-2">
							<label className="text-xs text-slate-600 dark:text-slate-400">Bytes/Row:</label>
							<select
								className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
								value={bytesPerRow}
								onChange={(e) => setBytesPerRow(Number(e.target.value))}
							>
								<option value={8}>8</option>
								<option value={16}>16</option>
								<option value={24}>24</option>
								<option value={32}>32</option>
							</select>
						</div>
					</div>
				</div>
				<div className="text-xs text-slate-600 dark:text-slate-400">
					Size: {bytes.length} bytes ({(bytes.length / 1024).toFixed(2)} KB)
				</div>
			</div>

			<div className="flex-1 overflow-hidden flex">
				{/* Scrollable hex/binary area */}
				<div className="flex-1 overflow-auto px-4">
					<div className="space-y-0">
						{rows.map((row, rowIndex) => {
							const offset = rowIndex * bytesPerRow;
							const offsetHex = offset.toString(16).toUpperCase().padStart(8, '0');

							return (
								<div key={rowIndex} className="flex gap-4 hover:bg-slate-100 dark:hover:bg-slate-800/20 items-start" style={{ minWidth: 'fit-content' }}>
									{/* Offset */}
									<div className="text-blue-600 dark:text-blue-400 select-none shrink-0" style={{ minWidth: '70px' }}>
										{offsetHex}
									</div>

									{/* Hex/Binary bytes */}
									<div className="flex gap-1 shrink-0">
										{row.map((byte, byteIndex) => {
											const globalIndex = offset + byteIndex;
											const isHovered = hoveredIndex === globalIndex;
											const selected = isSelected(globalIndex);

											return (
												<span
													key={byteIndex}
													className={`cursor-pointer transition-colors select-none ${
														selected
															? 'bg-blue-600/60 text-white'
															: isHovered
															? 'bg-yellow-400/40 dark:bg-yellow-600/40 text-yellow-900 dark:text-yellow-200'
															: 'text-green-600 dark:text-green-400'
													}`}
													onMouseDown={() => handleMouseDown(globalIndex)}
													onMouseEnter={() => {
														setHoveredIndex(globalIndex);
														handleMouseEnter(globalIndex);
													}}
													onMouseLeave={() => setHoveredIndex(null)}
													style={{
														display: 'inline-block',
														width: displayMode === 'hex' ? '1.5rem' : '5.5rem',
														textAlign: 'center',
													}}
												>
													{displayMode === 'hex' ? toHex(byte) : toBinary(byte)}
												</span>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Fixed ASCII column - always 32 characters wide */}
				<div className="border-l border-slate-200 dark:border-slate-700 pl-4 pr-4 overflow-y-auto shrink-0" style={{ width: '280px' }}>
					<div className="space-y-0">
						{rows.map((row, rowIndex) => {
							const offset = rowIndex * bytesPerRow;

							return (
								<div key={rowIndex} className="hover:bg-slate-100 dark:hover:bg-slate-800/20">
									<div className="text-slate-700 dark:text-slate-300">
										{row.map((byte, byteIndex) => {
											const globalIndex = offset + byteIndex;
											const isHovered = hoveredIndex === globalIndex;
											const selected = isSelected(globalIndex);

											return (
												<span
													key={byteIndex}
													className={`cursor-pointer transition-colors select-none ${
														selected
															? 'bg-blue-600/60 text-white'
															: isHovered
															? 'bg-yellow-400/40 dark:bg-yellow-600/40 text-yellow-900 dark:text-yellow-200'
															: ''
													}`}
													onMouseDown={() => handleMouseDown(globalIndex)}
													onMouseEnter={() => {
														setHoveredIndex(globalIndex);
														handleMouseEnter(globalIndex);
													}}
													onMouseLeave={() => setHoveredIndex(null)}
												>
													{toAscii(byte)}
												</span>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
