import { configFileTemplate, initialize } from './initialize/index.js'
import fs from 'fs'
import { parser } from './parsing/index.js'
import { interpreter } from './interpreter/index.js'

const args = process.argv

if (args[2] == 'init') {
	initialize()
}

function readTheFile(path) {
	const fileType = fs.statSync(path)
	if (fileType.isDirectory()) {
		console.log('it should be a file')
		return
	}

	const fileContent = fs.readFileSync(path, 'utf8')
	const parsedData = { children: parser(fileContent) }
	const html = interpreter(parsedData)

	console.log(html)

	const outputPath = path.replace(/\.md$/, '.html')
	fs.writeFileSync(outputPath, html)
	console.log(`Generated: ${outputPath}`)
}

const getDefaultFolder = fs.readFileSync(configFileTemplate, 'utf8')
const defaultFolder = `src/${JSON.parse(getDefaultFolder).base_folder}/blog.md`
readTheFile(defaultFolder)
