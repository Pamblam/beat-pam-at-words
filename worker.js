import { Board } from './modules/Board.module.js';
import { PrintBoard } from './modules/PrintBoard.module.js';
import { Turn } from './modules/Turn.module.js';

self.onmessage = async e => {
	let board = new Board();
	await board.load();

	let state = e.data.board;
	if(state && state.length && state[0].length && state[0].length === state.length){
		for(let y=0; y<state.length; y++){
			for(let x=0; x<state[y].length; x++){
				board.board[y][x].letter = state[y][x]!==0 ? state[y][x].toLowerCase() : null;
			}
		}
	}else{
		self.postMessage({error:'Invalid state.', complete:true});
		self.close();
		return;
	}

	let turn = await board.getBestTurn(e.data.my_letters, function(turn){
		self.postMessage({error:false, complete:false, turn:{
			cell_x: turn.cell_x,
			row_y: turn.row_y,
			is_vertical: turn.is_vertical,
			word: turn.word,
			score: turn.score,
			tiles: turn.tiles
		}});
	});

	if(turn === false){
		self.postMessage({error:'No moves found.', complete:true});
		self.close();
	}else{
		self.postMessage({error:false, complete:true, turn:{
			cell_x: turn.cell_x,
			row_y: turn.row_y,
			is_vertical: turn.is_vertical,
			word: turn.word,
			score: turn.score,
			tiles: turn.tiles
		}});
		self.close();
	}
};