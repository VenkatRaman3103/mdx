import { initialize } from './initialize/index.js'

const argumenst = process.argv

if (argumenst[2] == 'init') {
	initialize()
}
