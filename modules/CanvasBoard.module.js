export class CanvasBoard {
	width = 15;
	height = 15;
	container = null;

	constructor(boardLayout, container) {
		this.board = boardLayout;
		this.container = container;
		this.draw();
	}

	draw() {
		const cellSize = 30;
		const canvas = this.createGridCanvas(this.width, this.height, cellSize, ({ col, row, rectDraw }) => {
			this.fillRectDraw(canvas, rectDraw, '#004400');
		});
		this.container.appendChild(canvas);
	}

	createGridCanvas(cols, rows, cellSize, onCellClick) {
		const dpr = window.devicePixelRatio || 1;
		const cssW = cols * cellSize;
		const cssH = rows * cellSize;

		const canvas = document.createElement('canvas');
		canvas.style.width = '100%';
		canvas.style.height = 'auto';
		canvas.width	= Math.round(cssW * dpr);
		canvas.height = Math.round(cssH * dpr);

		const ctx = canvas.getContext('2d');
		ctx.scale(dpr, dpr);

		// Background
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, cssW, cssH);

		// Grid (crisp 1px)
		ctx.save();
		ctx.translate(0.5, 0.5);
		ctx.strokeStyle = '#000';
		ctx.lineWidth = 1;

		ctx.beginPath();
		for (let c = 0; c <= cols; c++) {
			const x = Math.min(c * cellSize, cssW - 1);
			ctx.moveTo(x, 0);
			ctx.lineTo(x, cssH - 1);
		}
		for (let r = 0; r <= rows; r++) {
			const y = Math.min(r * cellSize, cssH - 1);
			ctx.moveTo(0, y);
			ctx.lineTo(cssW - 1, y);
		}
		ctx.stroke();
		ctx.strokeRect(0, 0, cssW - 1, cssH - 1);
		ctx.restore();

		// Click handler -> returns cell + precomputed rect in DRAW space
		const pickCell = (evt) => {
			const rectEl = canvas.getBoundingClientRect();
			const xCss = evt.clientX - rectEl.left;
			const yCss = evt.clientY - rectEl.top;

			// Map from displayed CSS size back to draw space
			const x = xCss * (cssW / rectEl.width);
			const y = yCss * (cssH / rectEl.height);

			const eps = 1e-6;
			let col = Math.floor((x - eps) / cellSize);
			let row = Math.floor((y - eps) / cellSize);
			col = Math.max(0, Math.min(cols - 1, col));
			row = Math.max(0, Math.min(rows - 1, row));

			// *** Key fix: 0.5px inset to match half-pixel centered grid lines ***
			const inset = 0.5;
			const rectDraw = {
				x: col * cellSize + inset,
				y: row * cellSize + inset,
				w: cellSize - inset * 2,
				h: cellSize - inset * 2
			};

			if (typeof onCellClick === 'function') {
				onCellClick({ col, row, rectDraw, evt, canvas });
			}
		};

		canvas.addEventListener('pointerdown', pickCell);
		return canvas;
	}

	// Draw using the same coordinate system used to paint the grid
	fillRectDraw(canvas, rectDraw, color) {
		const dpr = window.devicePixelRatio || 1;
		const ctx = canvas.getContext('2d');
		ctx.save();
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 1 unit == 1 draw-space CSS px
		ctx.fillStyle = color;
		ctx.fillRect(rectDraw.x, rectDraw.y, rectDraw.w, rectDraw.h);
		ctx.restore();
	}
}
