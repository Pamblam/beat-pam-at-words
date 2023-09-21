export class Cell{
	constructor(modifier = null, col_x=null, row_y=null){
		this.letter = null;
		this.score_modifier = modifier;
		this.col_x = col_x;
		this.row_y = row_y;
	}
}