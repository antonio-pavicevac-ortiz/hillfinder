// eslint.config.mjs
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default [
  // 1) Ignore generated / external stuff
  {
    ignores: [
      // build output
      ".next/**",
      "dist/**",
      "build/**",

      // dependencies
      "node_modules/**",

      // type definition / env files
      "*.d.ts",
      "next-env.d.ts",

      // config / tooling files we don't care to lint right now
      "postcss.config.mjs",
      "tailwind.config.ts",
      "next.config.ts",
      "test-mongo.js",
    ],
  },

  // 2) Main project config for TS/JS source files
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "unused-imports": unusedImports,
      "react-hooks": reactHooks,
    },
    rules: {
      // Let TS handle types, we just want some niceties
      "no-var": "error",

      // App Router: disable page-routes rule
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/exhaustive-deps": "warn",

      // Unused imports / vars via eslint-plugin-unused-imports
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
