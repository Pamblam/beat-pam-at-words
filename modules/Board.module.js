import {Cell} from './Cell.module.js';
import {WordFinder, isWordValid} from './WordFinder.module.js';
import {Turn} from './Turn.module.js';

export class Board{

	letters = [];
	board = [];
	turns = [];

	constructor(letters, boardLayout){
		this.letters = letters;
		this.board = boardLayout.map((row, row_y)=>{
			return row.map((c, col_x)=>new Cell(c.trim() ? c : null, col_x, row_y));
		});
		this.turns = [];
	} 

	async addTurn(turn){
		let valid = await this.validateAndScoreTurn(turn);
		if(!valid) throw new Error("Invalid turn.");
		let curr_x = turn.cell_x, curr_y = turn.row_y;
		let letters = turn.getLetters();
		for(let i=0; i<letters.length; i++){
			let letter = letters[i];
			this.letters[letter.toUpperCase()].count = Math.max(0, this.letters[letter.toUpperCase()].count-1);
			this.board[curr_y][curr_x].letter = letter;
			if(turn.is_vertical){
				curr_y++;
			}else{
				curr_x++;
			}
		}
		this.turns.push(turn);
	}

	/**
	 * Get an array segments (array of cells) of the board that might be used to place a word, 
	 * or false if this space may not be used
	 */
	getSegmentsStartingAt(x, y, avail_letters_count, vertical = false){
		let segments = [];
		for(let segLen = 1; segLen <= avail_letters_count; segLen++){
			let s = this.getSegmentStartingAt(x, y, segLen, vertical);
			if(s) segments.push(s);
		}
		return segments;
	}

	/**
	 * Get a segment (array of cells) of the board that might be used to place a word, 
	 * or false if this space may not be used
	 */
	getSegmentStartingAt(x, y, avail_letters_count, vertical = false){
		let segment = [];
		let is_valid = false;
		
		// Get any consecutive FILLED cells BEFORE the requested segment.
		if(vertical){
			for(let prev_y = y-1; this.board[prev_y] && this.board[prev_y][x] && this.board[prev_y][x].letter !== null; prev_y--){
				segment.unshift(this.board[prev_y][x]);
				is_valid = true;
			}
		}else{
			for(let prev_x = x-1; this.board[y] && this.board[y][prev_x] && this.board[y][prev_x].letter !== null; prev_x--){
				segment.unshift(this.board[y][prev_x]);
				is_valid = true;
			}
		}

		// Get the following consecutive FILLED AND UNFILLED cells, until avail_letters_count UNFILLED cells have been added to segment.
		let curr_x = x, curr_y = y;
		for(let empty_cells_added=0; empty_cells_added < avail_letters_count && this.board[curr_y] && this.board[curr_y][curr_x];){
			let curr_cell = this.board[curr_y][curr_x];
			segment.push(curr_cell);
			if(curr_cell.letter !== null || curr_cell.score_modifier === "CC"){
				is_valid = true;
			}
			if(curr_cell.letter === null){
				empty_cells_added++;
			}
			if(vertical){
				curr_y++;
			}else{
				curr_x++;
			}
		}
		
		// Get any consecutive FILLED cells AFTER the requested segment.
		while(this.board[curr_y] && this.board[curr_y][curr_x]){
			let curr_cell = this.board[curr_y][curr_x];
			if(curr_cell.letter !== null || curr_cell.score_modifier === "CC"){
				is_valid = true;
			}
			if(curr_cell.letter !== null){
				segment.push(curr_cell);
			}else{
				break;
			}
			if(vertical){
				curr_y++;
			}else{
				curr_x++;
			}
		}

		// if the segment has not already been validated we need to check the
		// adjacent cells of the segment 
		if(!is_valid){
			const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
			const rows = this.board.length, cols = this.board[0].length;
			seg_loop: for(let s=0; s<segment.length; s++){
				let cell = segment[s];
				for (const [dr, dc] of dirs) {
					const r = cell.row_y + dr, c = cell.col_x + dc;
					if (r >= 0 && r < rows && c >= 0 && c < cols) {
						let curr_cell = this.board[r][c];
						if(curr_cell.letter !== null || curr_cell.score_modifier === "CC"){
							is_valid = true;
							break seg_loop;
						}
					}
				}
			}
		}

		// ensure that there is at least one blank cell in the segment
		if(is_valid){
			let blank_cells_in_seg = segment.filter(c=>!c.letter).length;
			if(blank_cells_in_seg === 0) is_valid = false;
		}
		
		return is_valid ? segment : false;
	}

	getPlayableSegments(avail_letters_count){
		let keys = [];
		let segments = [];
		let board_size = this.board.length;
		for(let y = 0; y < board_size; y++){
			for(let x = 0; x < board_size; x++){
				let segmentsAtPosH = this.getSegmentsStartingAt(x, y, avail_letters_count, false);
				for(let s = 0; s<segmentsAtPosH.length; s++){
					let segment = segmentsAtPosH[s];
					let key = `${x},${y},${0},${segment.length}`;
					if(-1 === keys.indexOf(key)){
						keys.push(key);
						segments.push({x, y, vertical: false, cells: segment});
					} 
				}
				let segmentsAtPosV = this.getSegmentsStartingAt(x, y, avail_letters_count, true);
				for(let s = 0; s<segmentsAtPosV.length; s++){
					let segment = segmentsAtPosV[s];
					let key = `${x},${y},${1},${segment.length}`;
					if(-1 === keys.indexOf(key)){
						keys.push(key);
						segments.push({x, y, vertical: true, cells: segment});
					} 
				}
			}
		}
		return segments;
	}

	getPositionOfBlanksUsed(letters, word, segment=[]){
		let availTiles = letters.split('');
		let wordLetters = word.trim().toUpperCase().split('');
		let positions = [];
		for(let i=0; i<wordLetters.length; i++){
			let letterOfWord = wordLetters[i]; // letter of the word
			if(segment[i].letter){
				if(segment[i].letter.toUpperCase() !== letterOfWord){
					throw new Error(`The word "${word}" does not fit in the provided segment`);
				}else{
					continue;
				}
			}
			let pos = availTiles.indexOf(letterOfWord); 
			if(pos === -1){
				pos = availTiles.indexOf('_');
				if(pos === -1) throw new Error(`The word "${word}" does not fit in the letters: ${letters}`);
				letterOfWord = '_';
				positions.push(i);
			}
			availTiles.splice(pos, 1);
		}
		return positions;
	}

	async getBestTurn(letters, callback){
		letters = letters.trim().toUpperCase();
		let best_play = false;
		let playable_segments = this.getPlayableSegments(letters.length);
		for(let i=0; i<playable_segments.length; i++){
			let {x, y, vertical, cells} = playable_segments[i];
			let segment = cells;
			let words = await WordFinder(letters, segment);

			for(let w=0; w<words.length; w++){
				let turn = new Turn(x, y, vertical, words[w]);
				try{ turn.setTiles(letters, this.board); }catch(e){ continue; }
				let blankPositions = this.getPositionOfBlanksUsed(letters, words[w], segment);
				let is_valid = await this.validateAndScoreTurn(turn, blankPositions);
				if(is_valid && callback) callback(turn);
				if(is_valid && (!best_play || turn.score > best_play.score)){
					best_play = turn;
				}
			}
		}
		return best_play;
	}

	getLetterScore(letter, x, y){
		let word_multiplier = 1;
		let score = this.letters[letter.toUpperCase()].score;
		if(x !== undefined && y !== undefined){
			if(this.board[y][x].score_modifier && !this.board[y][x].letter){
				if(this.board[y][x].score_modifier === 'TL') score = score * 3;
				if(this.board[y][x].score_modifier === 'DL') score = score * 2;
				if(this.board[y][x].score_modifier === 'Dw') word_multiplier = 2;
				if(this.board[y][x].score_modifier === 'Tw') word_multiplier = 3;
			}
		}
		return {score, word_multiplier};
	}

	async validateAndScoreTurn(turn){
		let score = 0;
		let word_multiplier = 1;
		let touches_word = false;

		let letters = turn.getLetters();
		var curr_x = turn.cell_x;
		var curr_y = turn.row_y;
			
		for(let i = 0; i<letters.length; i++){
			let play_letter = letters[i];
			let tile_letter = turn.tiles[i] === '_' ? '_' : play_letter;

			if(!this.board[curr_y] || !this.board[curr_y][curr_x]) return false;
			let cell = this.board[curr_y][curr_x];
			if(cell.letter){
				touches_word = true;
				if(cell.letter !== play_letter) return false;
			}else{
				if(cell.score_modifier === "CC"){
					touches_word = true;
				}
				let adjacent_word = this.getConsecutiveLettersAt(curr_x, curr_y, play_letter, !turn.is_vertical);
				if(adjacent_word.length > 1 && !(await isWordValid(adjacent_word))) return false;
			} 

			let s = this.getLetterScore(tile_letter, curr_x, curr_y);
			score += s.score;
			if(s.word_multiplier > 1) word_multiplier = s.word_multiplier;

			if(turn.is_vertical){
				curr_y++;
			}else{
				curr_x++;
			}
		}

		// if the segment has not already been validated we need to check the
		// adjacent cells of the segment 
		if(!touches_word){
			const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
			const rows = this.board.length, cols = this.board[0].length;
			curr_x = turn.cell_x;
			curr_y = turn.row_y;

			seg_loop: for(let i = 0; i<letters.length; i++){
				let cell = this.board[curr_y][curr_x];

				for (const [dr, dc] of dirs) {
					const r = cell.row_y + dr, c = cell.col_x + dc;
					if (r >= 0 && r < rows && c >= 0 && c < cols) {
						let curr_cell = this.board[r][c];
						if(curr_cell.letter !== null || curr_cell.score_modifier === "CC"){
							touches_word = true;
							break seg_loop;
						}
					}
				}

				if(turn.is_vertical){
					curr_y++;
				}else{
					curr_x++;
				}
			}
		}

		if(!touches_word) return false;


		turn.score = score * word_multiplier;
		return true;
	}

	getConsecutiveLettersAt(x, y, potential_letter, is_vertical){
		let letters = [potential_letter];
		let curr_x = x, curr_y = y;
		while(true){
			if(is_vertical) curr_y--; else curr_x--;
			if(!this.board[curr_y] || !this.board[curr_y][curr_x] || !this.board[curr_y][curr_x].letter) break;
			letters.unshift(this.board[curr_y][curr_x].letter);
		}
		curr_x = x, curr_y = y;
		while(true){
			if(is_vertical) curr_y++; else curr_x++;
			if(!this.board[curr_y] || !this.board[curr_y][curr_x] || !this.board[curr_y][curr_x].letter) break;
			letters.push(this.board[curr_y][curr_x].letter);
		}
		return letters.join('');
	}

}

