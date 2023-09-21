
export function PrintBoard(board, state_only=false, html=true){
	if(state_only){
		return JSON.stringify(board.board.map(row=>row.map(cell=>cell.letter||0)));
	}else{
		let row_header = "  |"+board.board[0].map((_, col)=>`${col}`.padStart(2," ")).join("|");
		return row_header+"\n"+board.board.map((row, row_y)=>`${row_y}`.padStart(2," ")+"|"+row.map(cell=>{
			let display = "  "
			if(cell.score_modifier) display = html ? `<span style='color:gray'>${cell.score_modifier}</span>` : cell.score_modifier;
			if(cell.letter) display = html ? ` <span style='color:red'>${cell.letter.toUpperCase()}</span>` : " "+cell.letter.toUpperCase();
			return display;
		}).join("|")).join("\n");
	}
}