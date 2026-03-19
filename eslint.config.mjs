import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import globals from "globals";
import importPlugin from "eslint-plugin-import";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const restrictedCompatPatterns = [
  {
    selector: "Identifier[name='Bun']",
    message: "Do not introduce Bun runtime branches in V1."
  },
  {
    selector: "Identifier[name='Deno']",
    message: "Do not introduce Deno runtime branches in V1."
  },
  {
    selector: "CallExpression[callee.name='require']",
    message: "Do not use CommonJS compatibility paths. Use ESM imports."
  },
  {
    selector: "MemberExpression[object.name='process'][property.name='versions'] MemberExpression[property.name='node']",
    message: "Do not branch on Node runtime version. Target the pinned runtime."
  }
];

export default tseslint.config(
  {
    ignores: [
      "content-repo/**",
      "storage/**",
      "tmp/**",
      "node_modules/**",
      ".cache/**",
      ".corepack/**",
      "validation/**"
    ]
  },
  {
    files: ["apps/**/*.{ts,tsx,js,mjs}", "packages/**/*.{ts,tsx,js,mjs}", "scripts/**/*.{ts,js,mjs}", "tests/**/*.{ts,js,mjs}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    plugins: {
      import: importPlugin,
      sonarjs
    },
    rules: {
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: false }],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
      "max-depth": ["error", 3],
      complexity: ["error", 10],
      "max-params": ["error", 4],
      "max-statements": ["error", 20],
      "no-restricted-syntax": ["error", ...restrictedCompatPatterns],
      "no-shadow": "error",
      "no-unreachable": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "node-fetch", message: "Do not add legacy fetch polyfills on the pinned runtime." }
          ],
          patterns: [
            { group: ["bun", "bun:*"], message: "Do not add Bun compatibility code in V1." },
            { group: ["deno", "deno:*"], message: "Do not add Deno compatibility code in V1." }
          ]
        }
      ],
      "import/no-cycle": "error",
      "sonarjs/cognitive-complexity": ["error", 10]
    }
  },
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "scripts/**/*.ts"]
  })),
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "scripts/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: rootDir
      }
    },
    plugins: {
      import: importPlugin,
      sonarjs
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-shadow": "error"
    }
  },
  {
    files: ["packages/**/*.{ts,tsx}"],
    rules: {
      "import/no-default-export": "error"
    }
  }
);
