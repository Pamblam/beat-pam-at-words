export class CanvasBoard {
	
	container = null;
	onCellClick = null;
	canvas = null;
	ctx = null;

	cellSize = 30;
	padding = 1.5;
	fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
	fontWeight = '600';

	colors = {
		'* ': 'rgb(236,209,77)',
		'  ': 'rgb(255,255,255)',
		'TW': 'rgb(212,145,56)',
		'TL': 'rgb(11,165,84)',
		'DW': 'rgb(186,83,75)',
		'DL': 'rgb(42,127,202)',
		'CC': 'rgb(105,33,68)'
	};

	constructor(boardLayout, container, onCellClick=null) {
		this.board = boardLayout;
		this.container = container;
		if(onCellClick) this.onCellClick = onCellClick;
		this.draw();
	}

	draw() {
		if(this.canvas) this.canvas.remove();
		this.createGridCanvas();
		this.container.appendChild(this.canvas);
	}

	createGridCanvas() {
		let cols = this.board[0].length;
		let rows = this.board.length;

		const dpr = window.devicePixelRatio || 1;
		const cssW = cols * this.cellSize;
		const cssH = rows * this.cellSize;

		this.canvas = document.createElement('canvas');
		this.canvas.style.width = '100%';
		this.canvas.style.height = 'auto';
		this.canvas.width = Math.round(cssW * dpr);
		this.canvas.height = Math.round(cssH * dpr);

		this.ctx = this.canvas.getContext('2d');
		this.ctx.scale(dpr, dpr);

		this.ctx.fillStyle = '#fff';
		this.ctx.fillRect(0, 0, cssW, cssH);

		this.ctx.save();
		this.ctx.translate(0.5, 0.5);
		this.ctx.strokeStyle = '#000';
		this.ctx.lineWidth = 1;

		this.ctx.beginPath();
		for (let c = 0; c <= cols; c++) {
			const x = Math.min(c * this.cellSize, cssW - 1);
			this.ctx.moveTo(x, 0);
			this.ctx.lineTo(x, cssH - 1);
		}
		for (let r = 0; r <= rows; r++) {
			const y = Math.min(r * this.cellSize, cssH - 1);
			this.ctx.moveTo(0, y);
			this.ctx.lineTo(cssW - 1, y);
		}
		this.ctx.stroke();
		this.ctx.strokeRect(0, 0, cssW - 1, cssH - 1);
		this.ctx.restore();

		const pickCell = (evt) => {
			const rectEl = this.canvas.getBoundingClientRect();
			const xCss = evt.clientX - rectEl.left;
			const yCss = evt.clientY - rectEl.top;

			const x = xCss * (cssW / rectEl.width);
			const y = yCss * (cssH / rectEl.height);

			const eps = 1e-6;
			let col = Math.floor((x - eps) / cellSize);
			let row = Math.floor((y - eps) / cellSize);
			col = Math.max(0, Math.min(cols - 1, col));
			row = Math.max(0, Math.min(rows - 1, row));

			const inset = 0.5;
			const rectDraw = {
				x: col * cellSize + inset,
				y: row * cellSize + inset,
				w: cellSize - inset * 2,
				h: cellSize - inset * 2
			};

			if (typeof this.onCellClick === 'function') {
				this.onCellClick({col, row, rectDraw});
			}
		};

		this.canvas.addEventListener('pointerdown', pickCell);
	}

	fillRectDraw(rectDraw, color, text, textColor = '#fff') {
		const dpr = window.devicePixelRatio || 1;
		this.ctx.save();
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.ctx.fillStyle = color;
		this.ctx.fillRect(rectDraw.x, rectDraw.y, rectDraw.w, rectDraw.h);

		if (text) {
			const maxW = Math.max(0, rectDraw.w - this.padding * 2);
			const maxH = Math.max(0, rectDraw.h - this.padding * 2);

			const testSize = 100;
			ctx.font = `${this.fontWeight} ${testSize}px ${this.fontFamily}`;

			const m = ctx.measureText(text);
			const mw = Math.max(1, m.width);
			const mh = (m.actualBoundingBoxAscent ?? testSize * 0.8) + (m.actualBoundingBoxDescent ?? testSize * 0.2);

			const scale = Math.max(0.1, Math.min(maxW / mw, maxH / mh));
			const fontSize = Math.floor(testSize * scale);

			ctx.font = `${this.fontWeight} ${fontSize}px ${this.fontFamily}`;
			ctx.fillStyle = textColor;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			let x = rectDraw.x + rectDraw.w / 2;
			let y = rectDraw.y + rectDraw.h / 2;

			ctx.fillText(text, x, y);
		}

		this.ctx.restore();
	}
}
