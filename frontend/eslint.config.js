import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      // Components and constants are allowed to look unused to the linter.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },
  {
    // A context file has to export both the provider component and the hook that
    // reads it. Splitting them would only satisfy the fast-refresh heuristic, at
    // the cost of an extra file and an import in every consumer.
    files: ["src/context/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // `toolbarButton` is a helper called during render that returns a <button>
    // with the given action as onClick. The action closures read textareaRef,
    // but only when clicked — never during render. The compiler cannot see
    // through the helper, so it reports each one.
    // Correct long-term fix: make toolbarButton a real component. Until then
    // this is a warning here rather than a false failure everywhere.
    files: ["src/components/MarkdownEditor/MarkdownEditor.jsx"],
    rules: { "react-hooks/refs": "warn" },
  },
]);
