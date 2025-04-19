import { configFileTemplate, initialize } from './initialize/index.js'
import fs from 'fs'
import { readdir } from 'fs/promises'

const argumenst = process.argv

if (argumenst[2] == 'init') {
	initialize()
}

function readTheFile(path) {
	const filePath = `src/${path}/blog.mdx`
	const fileType = fs.statSync(filePath)

	if (fileType.isDirectory()) {
		console.log('it should be a file')
		return
	}

	const fileContent = fs.readFileSync(filePath, 'utf8')
}

const getDefaultFolder = fs.readFileSync(configFileTemplate, 'utf8')
const defaultFolder = JSON.parse(getDefaultFolder).base_folder
readTheFile(defaultFolder)
