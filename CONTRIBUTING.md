# Contributing to RoboStock

## 1. Branch Naming

All development branches must be created from `main`.

Use the following naming convention:

```text
feature/fe-ROBO-<ID>-<description>
feature/be-ROBO-<ID>-<description>

fix/fe-ROBO-<ID>-<description>
fix/be-ROBO-<ID>-<description>
```

Where:

- `fe` — Frontend
- `be` — Backend
- `feature` — New functionality
- `fix` — Bug fix

Examples:

- `feature/fe-ROBO-12-login-page`
- `feature/be-ROBO-12-auth-api`
- `fix/fe-ROBO-21-map-rendering`

## 2. Commit Messages

Follow this format:

```text
<type>(<scope>): [ROBO-<ID>] <description>
```

Scopes:

- `fe` — Frontend
- `be` — Backend

Common types:

- `feat` — New functionality
- `fix` — Bug fix
- `refactor` — Code refactoring
- `style` — Formatting or styling changes
- `test` — Tests
- `docs` — Documentation
- `chore` — Maintenance tasks

Examples:

```text
feat(fe): [ROBO-12] add login page
feat(be): [ROBO-12] implement login endpoint
fix(fe): [ROBO-21] fix map rendering
```

## 3. Pull Requests

- All Pull Requests must target `main`.
- PR titles must include the area and YouTrack issue ID.

Format:

```text
[FE] ROBO-12 Login page
[BE] ROBO-12 Authentication API
```

Every PR should include:

- A short description of the changes.
- A link or reference to the YouTrack issue.
- Instructions on how to test the changes, when applicable.

## 4. Code Review

- Every PR requires at least **2 approvals**.
- The author should address review comments before merging.
- All review conversations must be resolved.
- New changes after approval may require another review.

## 5. Merging

- Use **Squash and merge**.
- Direct pushes to `main` are not allowed.
- Delete the feature branch after merging.
