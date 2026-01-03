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
  ]),
  // Import restrictions: enforce type imports from @/types
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/*"],
              importNamePattern: "^(Bifrost|.*Type|.*Interface|.*Config)$",
              message: "Import types from '@/types' instead of '@/lib/*'.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
