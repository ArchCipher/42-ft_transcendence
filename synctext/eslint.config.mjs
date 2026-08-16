import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Tiptap UI template and its supporting code are vendored upstream files.
    "components/tiptap-*/**",
    "hooks/use-composed-ref.ts",
    "hooks/use-cursor-visibility.ts",
    "hooks/use-element-rect.ts",
    "hooks/use-is-breakpoint.ts",
    "hooks/use-menu-navigation.ts",
    "hooks/use-scrolling.ts",
    "hooks/use-throttled-callback.ts",
    "hooks/use-tiptap-editor.ts",
    "hooks/use-unmount.ts",
    "hooks/use-window-size.ts",
    "lib/tiptap-utils.ts",
  ]),
]);

export default eslintConfig;
