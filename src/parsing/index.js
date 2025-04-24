import { identifier } from '../identifier/index.js'

export function parser(data) {
	const syntaxTree = []
	let cursor = 0

	while (cursor < data.length) {
		const char = data[cursor]

		if (identifier(char) == 'heading') {
			let hash = data[cursor]

			let headingLevel = 0

			while (hash != ' ') {
				cursor = cursor + 1
				hash = data[cursor]
				headingLevel = headingLevel + 1
			}
			cursor = cursor + 1

			let headingaChar
			let heading = data[cursor]

			cursor = cursor + 1

			while (headingaChar != '\n') {
				heading = heading + data[cursor]
				cursor = cursor + 1
				headingaChar = data[cursor]
			}

			syntaxTree.push({
				token: `h${headingLevel}`,
				value: tag(heading, `h${headingLevel}`),
			})
		} else if (identifier(char) == 'bullet') {
			let point = ''

			// skip the first space
			cursor = cursor + 2

			while (data[cursor] != '\n') {
				point = point + data[cursor]
				cursor = cursor + 1
			}
			syntaxTree.push({
				token: `bullet`,
				value: point,
			})
		} else if (identifier(char) == 'number') {
			let point = char
			let pointValue = ''

			// skip the dot and empty space
			cursor = cursor + 3

			while (data[cursor] != '\n') {
				pointValue = pointValue + data[cursor]
				cursor = cursor + 1
			}
			syntaxTree.push({
				token: `number`,
				point: point,
				value: pointValue,
			})
		}

		cursor = cursor + 1
	}

	console.log(syntaxTree)
}

function tag(value, tag) {
	return `<${tag}>${value}</${tag}>`
}
