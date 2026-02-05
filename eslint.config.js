import config from "eslint-config-kyle";

export { default } from "eslint-config-kyle";

config.push({
  rules: {
    quotes: "off",
    "no-console": "off",
    "unicorn/prevent-abbreviations": "off", // legacy codebase
    "@typescript-eslint/consistent-type-imports": "off",
    "sort-imports": "off",
  },
});
