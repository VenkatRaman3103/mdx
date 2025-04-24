import { identifier } from '../identifier/index.js'

export function parser(data) {
	const syntaxTree = []
	let cursor = 0
	let bulletPoints = []
	let numberedPoints = []

	while (cursor < data.length) {
		const char = data[cursor]

		if (identifier(char) === 'heading') {
			if (bulletPoints.length > 0) {
				syntaxTree.push({
					token: 'bullet-group',
					value: `<ul>${bulletPoints.map((p) => p.tag).join('')}</ul>`,
					children: bulletPoints,
				})
				bulletPoints = []
			}

			if (numberedPoints.length > 0) {
				syntaxTree.push({
					token: 'numbered-group',
					value: `<ol>${numberedPoints.map((p) => p.tag).join('')}</ol>`,
					children: numberedPoints,
				})
				numberedPoints = []
			}

			let headingLevel = 0
			while (data[cursor] === '#') {
				headingLevel++
				cursor++
			}
			if (data[cursor] === ' ') cursor++
			let heading = ''
			while (cursor < data.length && data[cursor] !== '\n') {
				heading += data[cursor]
				cursor++
			}
			syntaxTree.push({
				token: `h${headingLevel}`,
				value: tag(heading.trim(), `h${headingLevel}`),
			})
		} else if (identifier(char) === 'bullet') {
			cursor += 2
			let point = ''
			while (cursor < data.length && data[cursor] !== '\n') {
				point += data[cursor]
				cursor++
			}
			bulletPoints.push({
				token: 'bullet',
				value: point.trim(),
				tag: `<li>${point.trim()}</li>`,
			})
		} else if (identifier(char) === 'number') {
			const numberChar = char
			cursor += 3
			let pointValue = ''
			while (cursor < data.length && data[cursor] !== '\n') {
				pointValue += data[cursor]
				cursor++
			}
			numberedPoints.push({
				token: 'number',
				value: numberChar,
				tag: `<li>${pointValue.trim()}</li>`,
			})
		}
		cursor++
	}

	if (bulletPoints.length > 0) {
		syntaxTree.push({
			token: 'bullet-group',
			value: `<ul>${bulletPoints.map((p) => p.tag).join('')}</ul>`,
			children: bulletPoints,
		})
	}

	if (numberedPoints.length > 0) {
		syntaxTree.push({
			token: 'numbered-group',
			value: `<ol>${numberedPoints.map((p) => p.tag).join('')}</ol>`,
			children: numberedPoints,
		})
	}

	console.log(JSON.stringify(syntaxTree, null, 4))
	return syntaxTree
}

function tag(value, tag) {
	return `<${tag}>${value}</${tag}>`
}
