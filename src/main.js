import { configFileTemplate, initialize } from './initialize/index.js'
import fs from 'fs'
import { parser } from './parsing/index.js'

const argumenst = process.argv

if (argumenst[2] == 'init') {
	initialize()
}

function readTheFile(path) {
	const fileType = fs.statSync(path)

	if (fileType.isDirectory()) {
		console.log('it should be a file')
		return
	}

	const fileContent = fs.readFileSync(path, 'utf8')
	parser(fileContent)
}

const getDefaultFolder = fs.readFileSync(configFileTemplate, 'utf8')
const defaultFolder = `src/${JSON.parse(getDefaultFolder).base_folder}/blog.md`
readTheFile(defaultFolder)
