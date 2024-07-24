import eslint from '@eslint/js'
import tselint from 'typescript-eslint'
import globals from 'globals'

export default tselint.config(
  {
    ignores: [".webpack/", ".vite/"],
  },
  {
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
    rules:
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
