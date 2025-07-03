export function interpreter(data) {
	if (data.value) {
		return data.value
	}

	if (data.children) {
		return data.children.map((token) => interpreter(token)).join('')
	}

	return ''
}
