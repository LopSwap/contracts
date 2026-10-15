import js from '@eslint/js';
import promise from 'eslint-plugin-promise';
import globals from 'globals';

export default [
    {
        ignores: ['node_modules/', 'coverage/', 'generated/'],
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.mocha,
                ...globals.jest,
                artifacts: 'readonly',
                contract: 'readonly',
                assert: 'readonly',
                web3: 'readonly',
            },
        },
        plugins: {
            promise,
        },
        rules: {
            ...promise.configs.recommended.rules,

            strict: ['error', 'never'],
            indent: ['error', 4, { SwitchCase: 1 }],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'space-before-function-paren': [
                'error',
                {
                    anonymous: 'always',
                    named: 'never',
                    asyncArrow: 'always',
                },
            ],
            'no-use-before-define': 'off',
            'no-unused-expressions': 'off',
            eqeqeq: ['error', 'smart'],
            'dot-notation': ['error', { allowKeywords: true, allowPattern: '' }],
            'no-redeclare': ['error', { builtinGlobals: true }],
            'no-trailing-spaces': ['error', { skipBlankLines: true }],
            'eol-last': 'warn',
            'comma-spacing': ['error', { before: false, after: true }],
            camelcase: ['error', { properties: 'always' }],
            'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
            'comma-dangle': ['warn', 'always-multiline'],
            'no-dupe-args': 'error',
            'no-dupe-keys': 'error',
            'no-debugger': 'off',
            'no-undef': 'error',
            'object-curly-spacing': ['error', 'always'],
            'max-len': ['error', { code: 160 }],
            'generator-star-spacing': ['error', 'before'],
            'promise/avoid-new': 'off',
            'promise/always-return': 'off',
        },
    },
];
