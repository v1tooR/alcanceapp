import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='localStorage'][arguments.0.value=/senha|documento|laudo|cpf/i]",
          message:
            'Dados sensíveis não podem ser persistidos em localStorage. Use a camada de serviços.',
        },
      ],
    },
  },
  {
    // Estes módulos exportam utilitários ao lado de componentes de propósito:
    // variantes CVA dos primitivos, hooks de apoio do design system e o objeto
    // de rotas. A regra do Fast Refresh não se aplica bem a eles.
    files: [
      'src/components/ui/**/*.tsx',
      'src/components/shared/**/*.tsx',
      'src/components/graficos/**/*.tsx',
      'src/app/router.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
)
