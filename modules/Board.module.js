import {Cell} from './Cell.module.js';
import {WordFinder} from './WordFinder.module.js';
import {Turn} from './Turn.module.js';

export class Board{

	constructor(board_type='board'){
		this.board_type = board_type;
		this.letters = [];
		this.board = [];
		this.turns = [];
	} 

	async load(){
		this.letters = await fetch("./data/letter_values.json").then(r=>r.json());
		this.board = (await fetch("./data/"+this.board_type+".json").then(r=>r.json())).map((row, row_y)=>{
			return row.map((c, col_x)=>new Cell(c.trim() ? c : null, col_x, row_y));
		});
	}

	addTurn(turn){
		if(!this.validateAndScoreTurn(turn)) throw new Error("Invalid turn.");
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
	 * // Get array of all consecutive squares (segments), with 
		// between 1 and letters.length empty spaces.
		// including consecutive spaces that are filled

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
		
		// Get any consecutive FILLED cells BEFORE the requested segment.
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
		return is_valid ? segment : false;
	}

	// Get all segments in which you could make a valid play
	getPlayableSegments(avail_letters_count){
		let keys = [];
		let segments = [];
		let board_size = this.board.length;
		for(let y = 0; y < board_size; y++){
			for(let x = 0; x < board_size; x++){
				let segment, key; 

				segment = this.getSegmentStartingAt(x, y, avail_letters_count, false);
				if(segment){
					key = `${x},${y},${0},${segment.length}`;
					if(-1 === keys.indexOf(key)){
						keys.push(key);
						segments.push({x, y, vertical: false, cells: segment});
					} 
				}
				segment = this.getSegmentStartingAt(x, y, avail_letters_count, true);
				if(segment){
					key = `${x},${y},${1},${segment.length}`;
					if(-1 === keys.indexOf(key)){
						keys.push(key);
						segments.push({x, y, vertical: true, cells: segment});
					} 
				}
			}
		}
		return segments;
	}

	async getBestTurn(letters){
		let best_play = false;
		let playable_segments = this.getPlayableSegments(letters.length);
		for(let i=0; i<playable_segments.length; i++){
			let {x, y, vertical, cells} = playable_segments[i];
			let segment = cells;
			let words = await WordFinder(letters, segment);
			for(let w=0; w<words.length; w++){
				let turn = new Turn(x, y, vertical, words[w]);
				let is_valid = this.validateAndScoreTurn(turn);
				if(is_valid && (!best_play || turn.score > best_play.score)){
					best_play = turn;
				}
			}
		}
		return best_play;
	}

	/**
	 * Get the best move using only the letters provided
	 * 
	 * [OBSOLETED by getBestTurn()]
	 * This function is essentially useless (unless the board is empty)
	 * because I forgot to account for the letters that are already on the board.
	 * This function basically just does what all the online scrabble word finders 
	 * do, except it tells you where to play it.
	 * 
	 * @param {String} my_letters 
	 * @returns {Turn}
	 */
	async getBestTurnExclusive(my_letters){
		let words = await WordFinder(my_letters);
		let board_size = this.board.length;
		let best_play = null;
		for(let i=words.length; i--;){
			let word = words[i];
			for(let x=board_size-word.length; x--;){
				for(let y=board_size; y--;){
					let h = new Turn(x, y, false, word);
					if(this.validateAndScoreTurn(h) && (!best_play || h.score > best_play.score)){
						best_play = h;
					}
					let v = new Turn(x, y, true, word);
					if(this.validateAndScoreTurn(v) && (!best_play || v.score > best_play.score)){
						best_play = v;
					}
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

	validateAndScoreTurn(turn){
		let score = 0;
		let word_multiplier = 1;
		let touches_word = false;

		let letters = turn.getLetters();
		var curr_x = turn.cell_x;
		var curr_y = turn.row_y;
			
		for(let i = 0; i<letters.length; i++){
			let play_letter = letters[i];
			if(!this.board[curr_y] || !this.board[curr_y][curr_x]) return false;
			let cell = this.board[curr_y][curr_x];
			if(cell.letter){
				touches_word = true;
				if(cell.letter !== play_letter) return false;
			}else if(cell.score_modifier === "CC"){
				touches_word = true;
			}

			let s = this.getLetterScore(play_letter, curr_x, curr_y);
			score += s.score;
			if(s.word_multiplier > 1) word_multiplier = s.word_multiplier;

			if(turn.is_vertical){
				curr_y++;
			}else{
				curr_x++;
			}
			
		}

		turn.score = score * word_multiplier;
		return touches_word;
	}

	print(){
		

	}
}

