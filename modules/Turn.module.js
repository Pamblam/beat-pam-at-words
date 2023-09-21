export class Turn{
	constructor(cell_x, row_y, is_vertical, word, score=null){
		this.cell_x = cell_x;
		this.row_y = row_y;
		this.is_vertical = is_vertical;
		this.word = word.toLowerCase();
		this.score = score;
	}

	getLetters(){
		return this.word.toLowerCase().split('');
	}
}