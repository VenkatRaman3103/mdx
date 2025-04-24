export function identifier(char) {
	if (char === '#') {
		return 'heading'
	} else if (char === '-') {
		return 'bullet'
	} else if (/\d/.test(char)) {
		return 'number'
	} else {
		return undefined
	}
}
