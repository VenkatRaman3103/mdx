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
	let inBlockquote = false
	let blockquoteContent = ''
	let definitionList = []
	let inDefinitionList = false

	const flushParagraph = () => {
		if (currentParagraph.trim()) {
			syntaxTree.push({
				token: 'paragraph',
				value: `<p>${parseInlineElements(currentParagraph.trim())}</p>`,
			})
			currentParagraph = ''
		}
	}

	const flushBlockquote = () => {
		if (blockquoteContent.trim()) {
			const paragraphs = blockquoteContent.trim().split('\n\n')
			const quoteParagraphs = paragraphs
				.map((p) => `<p>${parseInlineElements(p.replace(/\n/g, ' ').trim())}</p>`)
				.join('')

			syntaxTree.push({
				token: 'blockquote',
				value: `<blockquote>${quoteParagraphs}</blockquote>`,
			})
			blockquoteContent = ''
			inBlockquote = false
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

	const flushDefinitionList = () => {
		if (definitionList.length > 0) {
			let dlHtml = '<dl>'
			definitionList.forEach((item) => {
				dlHtml += `<dt>${parseInlineElements(item.term)}</dt>`
				dlHtml += `<dd>${parseInlineElements(item.definition)}</dd>`
			})
			dlHtml += '</dl>'

			syntaxTree.push({
				token: 'definition-list',
				value: dlHtml,
				children: definitionList,
			})
			definitionList = []
			inDefinitionList = false
		}
	}

	const flushTable = () => {
		if (tableRows.length > 0) {
			let tableHtml = '<table>'

			const hasHeader = tableRows.length > 1

			if (hasHeader) {
				const [headerRow, ...bodyRows] = tableRows
				tableHtml += '<thead><tr>'
				headerRow.forEach((cell) => {
					tableHtml += `<th>${parseInlineElements(cell)}</th>`
				})
				tableHtml += '</tr></thead>'

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
			} else {
				tableHtml += '<tbody>'
				tableRows.forEach((row) => {
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

	const flushAll = () => {
		flushParagraph()
		flushBlockquote()
		flushLists()
		flushDefinitionList()
		flushTable()
	}

	while (cursor < data.length) {
		const char = data[cursor]
		const nextChar = data[cursor + 1] || ''
		const prevChar = data[cursor - 1] || ''
		const line = getLine(data, cursor)

		if (inBlockquote && char === '>' && nextChar === ' ') {
			cursor += 2
			let quoteLine = ''
			while (cursor < data.length && data[cursor] !== '\n') {
				quoteLine += data[cursor]
				cursor++
			}
			blockquoteContent += (blockquoteContent ? '\n' : '') + quoteLine
			continue
		}

		if (inBlockquote && char === '>' && nextChar === '\n') {
			blockquoteContent += '\n\n'
			cursor += 2
			continue
		}

		if (inBlockquote && char !== '>' && char !== '\n') {
			flushBlockquote()
		}

		if (
			(char === '`' && nextChar === '`' && data[cursor + 2] === '`') ||
			(char === '~' && nextChar === '~' && data[cursor + 2] === '~')
		) {
			flushAll()

			const delimiter = char
			if (!inCodeBlock) {
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

		if ((line.startsWith('    ') || line.startsWith('\t')) && line.trim()) {
			flushAll()

			let codeContent = ''
			while (cursor < data.length) {
				const currentLine = getLine(data, cursor)
				if (
					(currentLine.startsWith('    ') || currentLine.startsWith('\t')) &&
					currentLine.trim()
				) {
					const cleanLine = currentLine.startsWith('    ')
						? currentLine.slice(4)
						: currentLine.slice(1)
					codeContent += (codeContent ? '\n' : '') + cleanLine
					cursor = skipToNextLine(data, cursor)
				} else if (!currentLine.trim()) {
					codeContent += '\n'
					cursor = skipToNextLine(data, cursor)
				} else {
					break
				}
			}

			syntaxTree.push({
				token: 'code-block',
				value: `<pre><code>${escapeHtml(codeContent.trim())}</code></pre>`,
				language: '',
			})
			continue
		}

		if (
			cursor > 0 &&
			(char === '=' || char === '-') &&
			line.trim() &&
			line
				.trim()
				.split('')
				.every((c) => c === char)
		) {
			const prevLine = getPreviousLine(data, cursor)
			if (prevLine && prevLine.trim()) {
				if (
					syntaxTree.length > 0 &&
					syntaxTree[syntaxTree.length - 1].token === 'paragraph'
				) {
					const headerText = syntaxTree.pop().value.replace(/<\/?p>/g, '')
					const level = char === '=' ? 1 : 2
					syntaxTree.push({
						token: `h${level}`,
						value: tag(parseInlineElements(headerText), `h${level}`),
					})
				}
				cursor = skipToNextLine(data, cursor)
				continue
			}
		}

		if (identifier(char) === 'heading' && (cursor === 0 || data[cursor - 1] === '\n')) {
			flushAll()

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
			heading = heading.replace(/\s*#+\s*$/, '')

			syntaxTree.push({
				token: `h${headingLevel}`,
				value: tag(parseInlineElements(heading.trim()), `h${headingLevel}`),
			})
			continue
		}

		if (isHorizontalRule(line)) {
			flushAll()

			syntaxTree.push({
				token: 'hr',
				value: '<hr />',
			})
			cursor = skipToNextLine(data, cursor)
			continue
		}

		if (char === '>' && nextChar === ' ' && !inBlockquote) {
			flushAll()

			cursor += 2
			let quote = ''
			while (cursor < data.length && data[cursor] !== '\n') {
				quote += data[cursor]
				cursor++
			}
			blockquoteContent = quote
			inBlockquote = true
			continue
		}

		if (
			char !== ' ' &&
			char !== '\t' &&
			char !== '\n' &&
			!line.includes(':') &&
			cursor + 1 < data.length &&
			getLine(data, cursor + line.length + 1)
				.trim()
				.startsWith(': ')
		) {
			flushAll()

			const term = line.trim()
			cursor = skipToNextLine(data, cursor)

			const defLine = getLine(data, cursor)
			if (defLine.trim().startsWith(': ')) {
				const definition = defLine.trim().substring(2)
				definitionList.push({ term, definition })
				inDefinitionList = true
				cursor = skipToNextLine(data, cursor)
				continue
			}
		}

		if (char === '|' && line.includes('|')) {
			flushParagraph()
			flushBlockquote()
			flushLists()
			flushDefinitionList()

			let tempCursor = cursor
			while (tempCursor < data.length) {
				const currentLine = getLine(data, tempCursor)

				if (!currentLine.trim()) {
					tempCursor = skipToNextLine(data, tempCursor)
					continue
				}

				if (!currentLine.includes('|')) {
					break
				}

				if (currentLine.match(/^\s*\|?[\s\-\|:]+\|?\s*$/)) {
					tempCursor = skipToNextLine(data, tempCursor)
					continue
				}

				let cells = []

				const trimmedLine = currentLine.trim()

				let cellContent = trimmedLine
				if (cellContent.startsWith('|')) {
					cellContent = cellContent.slice(1)
				}
				if (cellContent.endsWith('|')) {
					cellContent = cellContent.slice(0, -1)
				}

				cells = cellContent.split('|').map((cell) => cell.trim())

				if (cells.length > 0 && cells.some((cell) => cell)) {
					tableRows.push(cells)
				}

				tempCursor = skipToNextLine(data, tempCursor)
			}

			cursor = tempCursor

			flushTable()
			continue
		}

		if (
			identifier(char, nextChar) === 'bullet' &&
			(cursor === 0 || data[cursor - 1] === '\n')
		) {
			flushParagraph()
			flushBlockquote()
			flushDefinitionList()
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

		if (/\d/.test(char) && data[cursor + 1] === '.' && data[cursor + 2] === ' ') {
			flushParagraph()
			flushBlockquote()
			flushDefinitionList()
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

		if (char === '\n' && nextChar === '\n') {
			flushAll()
			cursor++
			continue
		}

		if (char !== '\n') {
			currentParagraph += char
		} else if (currentParagraph.trim()) {
			currentParagraph += ' '
		}

		cursor++
	}

	flushAll()

	return syntaxTree
}

function parseInlineElements(text) {
	text = text.replace(/\[\^([^\]]+)\]/g, '<sup><a href="#fn$1">$1</a></sup>')

	text = text.replace(/\$\$([^$]+)\$\$/g, '<div class="math-display">$1</div>')
	text = text.replace(/\$([^$]+)\$/g, '<span class="math-inline">$1</span>')

	text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
	text = text.replace(/__(.*?)__/g, '<strong>$1</strong>')

	text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
	text = text.replace(/_(.*?)_/g, '<em>$1</em>')

	text = text.replace(/~~(.*?)~~/g, '<del>$1</del>')

	text = text.replace(/`([^`]+)`/g, '<code>$1</code>')

	text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

	text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

	text = text.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1">$1</a>')

	text = text.replace(/---/g, '&mdash;')

	text = text.replace(/--/g, '&ndash;')

	text = text.replace(/\.\.\./g, '&hellip;')

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

function getPreviousLine(data, cursor) {
	let lineStart = cursor
	while (lineStart > 0 && data[lineStart - 1] !== '\n') {
		lineStart--
	}

	if (lineStart === 0) return null

	let prevLineStart = lineStart - 2
	while (prevLineStart >= 0 && data[prevLineStart] !== '\n') {
		prevLineStart--
	}
	prevLineStart++

	return data.substring(prevLineStart, lineStart - 1)
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
