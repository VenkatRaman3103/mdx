export function identifier(char, nextChar = '', prevChar = '') {
	// headings
	if (char === '#') return 'heading'

	// bullet points
	if (char === '-' && nextChar === ' ') return 'bullet'
	if (char === '*' && nextChar === ' ') return 'bullet'
	if (char === '+' && nextChar === ' ') return 'bullet'

	// numbered lists
	if (/\d/.test(char)) return 'number'

	// code blocks
	if (char === '`') return 'code'

	// blockquotes
	if (char === '>' && nextChar === ' ') return 'blockquote'

	// links and images
	if (char === '[') return 'link_start'
	if (char === '!') return 'image'

	// emphasis
	if (char === '*' || char === '_') return 'emphasis'

	// tables
	if (char === '|') return 'table'

	// horizontal rules
	if (char === '-' || char === '*' || char === '_') return 'hr'

	return 'text'
}
