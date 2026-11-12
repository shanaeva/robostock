export default {
  extends: ["@commitlint/config-conventional"],

  plugins: [
    {
      rules: {
        "ticket-id": ({ subject }) => [
          /^\[ROBO-\d+\]\s+\S/.test(subject || ""),
          "Subject must start with [ROBO-<ID>] followed by a description",
        ],
      },
    },
  ],

  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "style", "test", "docs", "chore"],
    ],
    "scope-enum": [2, "always", ["fe", "be"]],
    "ticket-id": [2, "always"],
  },
};
