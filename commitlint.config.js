module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "chore",
        "ci",
        "build",
        "revert",
        "wip",
      ],
    ],
    "subject-case": [2, "always", "lower-case"],
    "body-max-line-length": [1, "always", 200],
  },
};
