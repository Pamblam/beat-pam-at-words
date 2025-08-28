export class Turn{
	constructor(cell_x, row_y, is_vertical, word, score=null){
		this.cell_x = cell_x;
		this.row_y = row_y;
		this.is_vertical = is_vertical;
		this.word = word.toLowerCase();
		this.score = score;
		this.tiles = word.toUpperCase().trim().split('');
	}

	getLetters(){
		return this.word.toLowerCase().split('');
	}

	setTiles(letters, board){
		this.tiles = [];
		let wordLetters = this.word.toUpperCase().trim().split('');
		let availTiles = letters.toUpperCase().trim().split('');
		var curr_x = this.cell_x;
		var curr_y = this.row_y;
		for(let i=0; i<wordLetters.length; i++){
			if(!board[curr_y] || !board[curr_y][curr_x]){
				throw new Error("Invalid turn.");
			}
			let cell = board[curr_y][curr_x];
			let tileLetter;
			if(cell.letter){
				if(cell.letter.toUpperCase() !== wordLetters[i]){
					throw new Error("Invalid turn.");
				}
				tileLetter = '*';
			}else{
				tileLetter = wordLetters[i];
				let tilesetPos = availTiles.indexOf(tileLetter);
				if(tilesetPos === -1){
					tileLetter = '_';
					tilesetPos = availTiles.indexOf(tileLetter);
					if(tilesetPos === -1){
						throw new Error("Invalid turn.");
					}
				}
				availTiles.splice(tilesetPos, 1);
			}
			this.tiles.push(tileLetter);
			if(this.is_vertical){
				curr_y++;
			}else{
				curr_x++;
			}
		}
	}
}