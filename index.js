

import { Board } from './modules/Board.module.js';
import { PrintBoard } from './modules/PrintBoard.module.js';
import { Turn } from './modules/Turn.module.js';
import { WordFinder } from './modules/WordFinder.module.js';

(async () => {
	let my_letters = '';

	let board = new Board();
	await board.load();

	const setLetters = letters => {
		if ($("#letters").val() !== letters) $("#letters").val(letters)
		my_letters = letters.toUpperCase().trim();
	};

	const addWordToBoard = async (word, col, row, dir) => {
		await board.addTurn(new Turn(col, row, dir === 'V', word));
		$("#board").html(`<pre>${PrintBoard(board)}</pre>`);
	};

	const getBestMove = () => {
		return new Promise(d=>{
			if (!my_letters.length){
				alert("No letters set.");
				d();
				return;
			} 
			board.getBestTurn(my_letters).then(turn => {
				if (turn === false){
					alert("Can't find a word that fits.");
					d();
				}else{
					$("#word").val(turn.word.toUpperCase());
					$("#col").val(turn.cell_x);
					$("#row").val(turn.row_y);
					$("#direction").val(turn.is_vertical ? 'V' : 'H');
					d();
				}
				
			});
		});
	}

	$("#board").html(`<pre>${PrintBoard(board)}</pre>`);
	$("#gamestate").val(PrintBoard(board, true));

	$("#letters").on('input', function () {
		setLetters(this.value);
	});

	$("#update_board").on('click', async function (e) {
		e.preventDefault();
		let word = $("#word").val();
		let col = +$("#col").val();
		let row = +$("#row").val();
		let dir = $("#direction").val();
		await addWordToBoard(word, col, row, dir);
		$("#gamestate").val(PrintBoard(board, true));
	});

	let state_change_timer = null;
	$("#gamestate").on("change", function(e){
		if($("#gamestate").val().trim() === '') return;
		if(state_change_timer) clearTimeout(state_change_timer);
		state_change_timer = setTimeout(()=>{
			let state = false;
			try{ state = JSON.parse($("#gamestate").val().trim()); }catch(e){}
			if(state && state.length && state[0].length && state[0].length === state.length){
				for(let y=0; y<state.length; y++){
					for(let x=0; x<state[y].length; x++){
						board.board[y][x].letter = state[y][x]!==0 ? state[y][x].toLowerCase() : null;
					}
				}
				$("#board").html(`<pre>${PrintBoard(board)}</pre>`);
				alert("State Updated");
			}else{
				alert("Invalid state. Reverting");
				$("#gamestate").val(PrintBoard(board, true));
			}
			state_change_timer = false;
		}, 1000);
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

	$("#copystate").click(function(e){
		e.preventDefault();
		copyTextToClipboard(PrintBoard(board, true));
	});

	function fallbackCopyTextToClipboard(text) {
		var textArea = document.createElement("textarea");
		textArea.value = text;

		// Avoid scrolling to bottom
		textArea.style.top = "0";
		textArea.style.left = "0";
		textArea.style.position = "fixed";

		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		try {
			var successful = document.execCommand('copy');
			var msg = successful ? 'successful' : 'unsuccessful';
			console.log('Fallback: Copying text command was ' + msg);
		} catch (err) {
			console.error('Fallback: Oops, unable to copy', err);
		}

		document.body.removeChild(textArea);
	}

	function copyTextToClipboard(text) {
		if (!navigator.clipboard) {
			fallbackCopyTextToClipboard(text);
			return;
		}
		navigator.clipboard.writeText(text).then(function () {
			console.log('Async: Copying to clipboard was successful!');
		}, function (err) {
			console.error('Async: Could not copy text: ', err);
		});
	}

})();