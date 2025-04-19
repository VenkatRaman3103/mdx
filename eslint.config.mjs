export default [
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				require: 'readonly',
				module: 'readonly',
				process: 'readonly',
				__dirname: 'readonly',
			},
		},
		rules: {
			'no-unused-vars': 'warn',
			'no-console': 'off',
		},
	},
]
