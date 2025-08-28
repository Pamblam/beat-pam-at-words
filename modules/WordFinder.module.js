
let dict = [];

export async function isWordValid(word){
	if (!dict.length) dict = await fetch("./data/wordlist.json").then(r => r.json());
	return dict.includes(word.trim().toLowerCase());
}

export async function WordFinder(word, segment) {
	if (!dict.length) dict = await fetch("./data/wordlist.json").then(r => r.json());
	let my_letters = word.toLowerCase().split('');

	const getWordsContainingLetters = letters => {
		return dict.filter(word => {
			let word_letters = word.split('');
			let blanks = 0;
			for (let i = letters.length; i--;) {
				let letter = letters[i];
				if(letter === '_'){
					blanks++;
					continue;
				}
				let letter_index = word_letters.indexOf(letter);
				if (letter_index > -1) {
					word_letters.splice(letter_index, 1);
					if(!word_letters.length) return true;
				}
			}
			return word_letters.length <= blanks;
		});
	};

	if (!segment) return getWordsContainingLetters(my_letters);

	const wordFitsInSegment = (word, segment) => {
		let letters = word.split('');
		let is_valid = false;
		let letters_used = 0;
		offest_loop: for (let offset = 0; offset <= segment.length - letters.length; offset++) {
			cell_loop: for (let i = 0; i < segment.length; i++) {
				let cell = segment[i];
				let letter = letters[i - offset];
				if (cell.letter) {
					if (cell.letter === letter) {
						is_valid = true;
					} else {
						is_valid = false;
						letters_used = 0;
						continue offest_loop;
					}
				} else if(letter){
					letters_used++;
					if (cell.score_modifier === 'CC') {
						is_valid = true;
					}
				}
			}

			if(is_valid && letters_used) return true;
		}
		return false;
	}

	// Given the cells, get a subset of dict containing all available letters
	let avail_letters = [...my_letters, ...segment.map(c => c.letter).filter(l => !!l)];
	return getWordsContainingLetters(avail_letters).filter(word => {
		return wordFitsInSegment(word, segment);
	});
}