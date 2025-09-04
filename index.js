

import { Board } from './modules/Board.module.js';
import { CanvasBoard } from './modules/CanvasBoard.module.js';
import { PrintBoard } from './modules/PrintBoard.module.js';
import { Turn } from './modules/Turn.module.js';

(async () => {
	const game_letters = await fetch("./data/letter_values.json").then(r=>r.json());
	const board_layout = await fetch("./data/board.json").then(r=>r.json());
	const board_canvas = new CanvasBoard(board_layout, document.getElementById('board'), ({col,row})=>{
		$("#col").val(col);
		$("#row").val(row);
		console.log($("#word").val());
		if($("#word").val().toUpperCase().trim()){
			console.log('hetrer');
			board_canvas.setUncommittedWord(+col, +row, $("#word").val().toUpperCase().trim(), $("#direction").val()==='V');
		}
	});

	let my_letters = '';
	let possible_turns = [];

	let current_saved_game_index = -1;
	let saved_games = JSON.parse(localStorage.getItem('beat-pam') || '[]');

	let board = new Board(game_letters, board_layout);

	const renderPossibleTurns = () => {
		possible_turns = possible_turns.sort((a,b)=>a.score>b.score?-1:1);
		$("#possible_turns").html(possible_turns.map((turn,i)=>{
			return `<a href='#' class="badge badge-primary p-1 m-1" data-index='${i}'>${turn.word} (${turn.score})</a>`;
		}).join(''));
		$("#possible_turns .badge").click(function(e){
			e.preventDefault();
			let turn = possible_turns[this.dataset.index];
			$("#word").val(turn.word.toUpperCase());
			$("#col").val(turn.cell_x);
			$("#row").val(turn.row_y);
			$("#direction").val(turn.is_vertical ? 'V' : 'H');
			board_canvas.setUncommittedWord(+turn.cell_x, +turn.row_y, turn.word, turn.is_vertical);
		});
	};

	const loadState = async state => {
		board = new Board(game_letters, board_layout);
		if(state && state.length && state[0].length && state[0].length === state.length){
			for(let y=0; y<state.length; y++){
				for(let x=0; x<state[y].length; x++){
					board.board[y][x].letter = state[y][x]!==0 ? state[y][x].toLowerCase() : null;
				}
			}
			board_canvas.setBoard(board);
			return true;
		}
		return false;
	};

	const renderSavedGamesSelect = ()=>{
		document.getElementById('savedgames').innerHTML = (current_saved_game_index === -1 ? '<option></option>' : '')+saved_games.map((g,i)=>{
			return `<option value='${i}' ${current_saved_game_index === i ? 'selected' : ''}>${g.title}</option>`;
		}).join('');
	};

	const setLetters = letters => {
		if ($("#letters").val() !== letters) $("#letters").val(letters)
		my_letters = letters.toUpperCase().trim();
	};

	const addWordToBoard = async (word, col, row, dir) => {
		await board.addTurn(new Turn(col, row, dir === 'V', word));
		board_canvas.setBoard(board);
		board_canvas.clearUncommittedWord(true);
		possible_turns = [];
		renderPossibleTurns();
	};

	const getBestMove = () => {
		return new Promise(d=>{
			if (!my_letters.length){
				alert("No letters set.");
				d();
				return;
			}
			
			if (window.Worker){

				const workerThread = new Worker("worker.js", {type: "module"});
				workerThread.postMessage({board:JSON.parse(PrintBoard(board, true)), my_letters});
				workerThread.onmessage = e => {
					if(e.data.error) alert(e.data.error);
					if(e.data.turn){
						$("#word").val(e.data.turn.word.toUpperCase());
						$("#col").val(e.data.turn.cell_x);
						$("#row").val(e.data.turn.row_y);
						$("#direction").val(e.data.turn.is_vertical ? 'V' : 'H');
						possible_turns.push(e.data.turn);
						board_canvas.setUncommittedWord(+e.data.turn.cell_x, +e.data.turn.row_y, e.data.turn.word, e.data.turn.is_vertical);
						renderPossibleTurns();
					}
					if(e.data.complete){
						workerThread.terminate();
						workerThread.onmessage = null; 
						workerThread.onerror = null;
						d();
					}
				};

			}else{
				board.getBestTurn(my_letters, (turn)=>{
					possible_turns.push(turn);
				}).then(turn => {
					renderPossibleTurns();
					if (turn === false){
						alert("Can't find a word that fits.");
						d();
					}else{
						$("#word").val(turn.word.toUpperCase());
						$("#col").val(turn.cell_x);
						$("#row").val(turn.row_y);
						$("#direction").val(turn.is_vertical ? 'V' : 'H');
						board_canvas.setUncommittedWord(+turn.cell_x, +turn.row_y, turn.word, turn.is_vertical);
						d();
					}
				});
			}
		});
	}

	renderSavedGamesSelect();

	board_canvas.setBoard(board);

	$("#word, #col, #row, #direction").on('input',()=>{
		let word = $("#word").val();
		let col = $("#col").val();
		let row = $("#row").val();
		let vert = $("#direction").val() === 'V';
		if(word.trim() && col !== '' && !isNaN(+col) && row !== '' && !isNaN(+row)){
			board_canvas.setUncommittedWord(+col, +row, word, vert);
		}
	});

	$("#letters").on('input', function () {
		setLetters(this.value);
	});

	$("#savegame").click(function(e){
		e.preventDefault();
		let title = $("#gametitle").val().trim() || 'Untitled Game #'+saved_games.length;
		let gameboard = JSON.parse(PrintBoard(board, true));
		let letters = $("#letters").val();
		let game = {title, board:gameboard, letters};

		if(current_saved_game_index === -1){
			current_saved_game_index = saved_games.length;
			saved_games.push(game);
		}else{
			saved_games[current_saved_game_index] = game;
		}

		localStorage.setItem('beat-pam', JSON.stringify(saved_games));
		renderSavedGamesSelect();
	});

	$("#newgame").click(async function(e){
		// let boardLayout = await boardModal();
		// if(!boardLayout) return;
		// console.log(boardLayout);
		// return;
		e.preventDefault();
		current_saved_game_index = -1;
		$("#gametitle").val('');
		board = new Board(game_letters, board_layout);
		$("#letters").val('');
		renderSavedGamesSelect();
	});

	$("#savedgames").change(function(){
		current_saved_game_index = +this.value;
		let {title,board,letters} = saved_games[current_saved_game_index];
		$("#gametitle").val(title);
		$("#letters").val(letters||'');
		renderSavedGamesSelect();
		loadState(board);
	});

	$('#deletegame').click(function(e){
		e.preventDefault();
		if(current_saved_game_index > -1){
			saved_games.splice(current_saved_game_index, 1);
			current_saved_game_index = -1;
			$("#gametitle").val('');
			board = new Board(game_letters, board_layout);
			$("#letters").val('');
			localStorage.setItem('beat-pam', JSON.stringify(saved_games));
			renderSavedGamesSelect();
		}
	});

	$("#update_board").on('click', async function (e) {
		e.preventDefault();
		let word = $("#word").val();
		let col = +$("#col").val();
		let row = +$("#row").val();
		let dir = $("#direction").val();
		await addWordToBoard(word, col, row, dir);
		$("#word").val('');
		$("#col").val('');
		$("#row").val('');
	});

	let processing = false;
	$("#best_move").click(function (e) {
		e.preventDefault();
		if (processing) return false;
		processing = true;
		$("#best_move").html("Thinking...");
		setLetters($("#letters").val());
		setTimeout(async ()=>{
			await getBestMove();
			processing = false;
			$("#best_move").html("Find best move");
		},10);
	});

	function boardModal(){
		return new Promise(d=>{
			$("#boardtoolmodal").modal('show');
			let canvasDiv = document.getElementById('canvasdiv');
			let board = new CanvasBoard(15, 15, canvasDiv);
			$("#boardwidth").val(15).off('change').change();
			$("#boardheight").val(15);
			
		});
	}

})();