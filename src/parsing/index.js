import { identifier } from '../identifier/index.js'

export function parser(data) {
	const syntaxTree = []
	let cursor = 0
	let bulletPoints = []
	let numberedPoints = []
	let tableRows = []
	let inCodeBlock = false
	let codeBlockLang = ''
	let codeBlockContent = ''
	let currentParagraph = ''

	const flushParagraph = () => {
		if (currentParagraph.trim()) {
			syntaxTree.push({
				token: 'paragraph',
				value: `<p>${parseInlineElements(currentParagraph.trim())}</p>`,
			})
			currentParagraph = ''
		}
	}

	const flushLists = () => {
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
	}

	const flushTable = () => {
		if (tableRows.length > 0) {
			const [headerRow, ...bodyRows] = tableRows
			let tableHtml = '<table>'

			if (headerRow) {
				tableHtml += '<thead><tr>'
				headerRow.forEach((cell) => {
					tableHtml += `<th>${parseInlineElements(cell)}</th>`
				})
				tableHtml += '</tr></thead>'
			}

			if (bodyRows.length > 0) {
				tableHtml += '<tbody>'
				bodyRows.forEach((row) => {
					tableHtml += '<tr>'
					row.forEach((cell) => {
						tableHtml += `<td>${parseInlineElements(cell)}</td>`
					})
					tableHtml += '</tr>'
				})
				tableHtml += '</tbody>'
			}

			tableHtml += '</table>'

			syntaxTree.push({
				token: 'table',
				value: tableHtml,
				children: tableRows,
			})
			tableRows = []
		}
	}

	while (cursor < data.length) {
		const char = data[cursor]
		const nextChar = data[cursor + 1] || ''
		const prevChar = data[cursor - 1] || ''
		const line = getLine(data, cursor)

		// code blocks (```language)
		if (char === '`' && nextChar === '`' && data[cursor + 2] === '`') {
			flushParagraph()
			flushLists()
			flushTable()

			if (!inCodeBlock) {
				// starting code block
				cursor += 3
				let lang = ''
				while (cursor < data.length && data[cursor] !== '\n') {
					lang += data[cursor]
					cursor++
				}
				codeBlockLang = lang.trim()
				if (cursor < data.length && data[cursor] === '\n') {
					cursor++
				}
				inCodeBlock = true
				codeBlockContent = ''
				continue
			} else {
				// ending code block
				syntaxTree.push({
					token: 'code-block',
					value: `<pre><code class="language-${codeBlockLang}">${escapeHtml(codeBlockContent.trim())}</code></pre>`,
					language: codeBlockLang,
				})
				inCodeBlock = false
				codeBlockContent = ''
				codeBlockLang = ''
				cursor += 3
				while (cursor < data.length && data[cursor] !== '\n') {
					cursor++
				}
				continue
			}
		}

		if (inCodeBlock) {
			codeBlockContent += char
			cursor++
			continue
		}

		// headings
		if (identifier(char) === 'heading' && (cursor === 0 || data[cursor - 1] === '\n')) {
			flushParagraph()
			flushLists()
			flushTable()

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
				value: tag(parseInlineElements(heading.trim()), `h${headingLevel}`),
			})
			continue
		}

		// horizontal rules (---, ***, ___)
		if (isHorizontalRule(line)) {
			flushParagraph()
			flushLists()
			flushTable()

			syntaxTree.push({
				token: 'hr',
				value: '<hr />',
			})
			cursor = skipToNextLine(data, cursor)
			continue
		}

		// blockquotes
		if (char === '>' && nextChar === ' ') {
			flushParagraph()
			flushLists()
			flushTable()

			cursor += 2
			let quote = ''
			while (cursor < data.length && data[cursor] !== '\n') {
				quote += data[cursor]
				cursor++
			}
			syntaxTree.push({
				token: 'blockquote',
				value: `<blockquote><p>${parseInlineElements(quote.trim())}</p></blockquote>`,
			})
			continue
		}

		// tables
		if (char === '|' && line.includes('|')) {
			flushParagraph()
			flushLists()

			if (line.match(/^\s*\|[\s\-\|:]*\|\s*$/)) {
				cursor = skipToNextLine(data, cursor)
				continue
			}

			const cells = line
				.split('|')
				.map((cell) => cell.trim())
				.filter((cell) => cell)
			tableRows.push(cells)
			cursor = skipToNextLine(data, cursor)
			continue
		}

		// bullet points
		if (
			identifier(char, nextChar) === 'bullet' &&
			(cursor === 0 || data[cursor - 1] === '\n')
		) {
			flushParagraph()
			flushTable()

			cursor += 2
			let point = ''
			while (cursor < data.length && data[cursor] !== '\n') {
				point += data[cursor]
				cursor++
			}
			bulletPoints.push({
				token: 'bullet',
				value: point.trim(),
				tag: `<li>${parseInlineElements(point.trim())}</li>`,
			})
			continue
		}

		// numbered lists
		if (/\d/.test(char) && data[cursor + 1] === '.' && data[cursor + 2] === ' ') {
			flushParagraph()
			flushTable()

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
				tag: `<li>${parseInlineElements(pointValue.trim())}</li>`,
			})
			continue
		}

		// empty lines
		if (char === '\n' && nextChar === '\n') {
			flushParagraph()
			flushLists()
			flushTable()
			cursor++
			continue
		}

		// regular text
		if (char !== '\n') {
			currentParagraph += char
		} else if (currentParagraph.trim()) {
			currentParagraph += ' '
		}

		cursor++
	}

	// flush any remaining content
	flushParagraph()
	flushLists()
	flushTable()

	return syntaxTree
}

function parseInlineElements(text) {
	// bold (**text** or __text__)
	text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
	text = text.replace(/__(.*?)__/g, '<strong>$1</strong>')

	// italic (*text* or _text_)
	text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
	text = text.replace(/_(.*?)_/g, '<em>$1</em>')

	// strikethrough (~~text~~)
	text = text.replace(/~~(.*?)~~/g, '<del>$1</del>')

	// inline code (`code`)
	text = text.replace(/`([^`]+)`/g, '<code>$1</code>')

	// links [text](url)
	text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

	// images ![alt](src)
	text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

	// autolinks <url>
	text = text.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1">$1</a>')

	return text
}

function getLine(data, cursor) {
	let line = ''
	let i = cursor
	while (i < data.length && data[i] !== '\n') {
		line += data[i]
		i++
	}
	return line
}

function skipToNextLine(data, cursor) {
	while (cursor < data.length && data[cursor] !== '\n') {
		cursor++
	}
	return cursor + 1
}

function isHorizontalRule(line) {
	const trimmed = line.trim()
	return /^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed) || /^_{3,}$/.test(trimmed)
}

function tag(value, tag) {
	return `<${tag}>${value}</${tag}>`
}

function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}
