import fs from 'fs'

export const configFileTemplate = 'mdx.config.json'
// const defaults = JSON.parse(fs.readFileSync('src/initialize/defaults.json', 'utf8'))
const defaultsTemplate = fs.readFileSync('src/initialize/defaults.json', 'utf8')

export function initialize() {
	if (!fs.existsSync(configFileTemplate)) {
		fs.writeFileSync(configFileTemplate, 'w')
		console.log(`configuration file created successfully!\n${configFileTemplate}`)

		fs.writeFileSync(configFileTemplate, defaultsTemplate)
		console.log('default content has been written')

		const getDefaults = fs.readFileSync(configFileTemplate, 'utf8')
		const defaults = JSON.parse(getDefaults)
		console.log('defaults:', defaults)

		if (!fs.existsSync(`src/${defaults.base_folder}`)) {
			fs.mkdirSync(`src/${defaults.base_folder}`)
		}
	}
}
