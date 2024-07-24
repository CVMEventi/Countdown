import eslint from '@eslint/js'
import tselint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import globals from 'globals'

export default tselint.config(
  {
    ignores: [".webpack/", ".vite/"],
  },
  {
    plugins: {
      import: importPlugin
    },
    extends: [
      eslint.configs.recommended,
      ...tselint.configs.recommended,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      }
    },
    rules: {
      "import/extensions": ["error", "always"]
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx", ".vue"],
        },
      }
    }
  }
)

/*
export default [...fixupConfigRules(compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
)), {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        parser: tsParser,
    },

    settings: {
        "import/resolver": {
            node: {
                extensions: [".js", ".jsx", ".ts", ".tsx", ".vue"],
            },
        },
    },
}];*/
