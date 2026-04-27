# Version Control and CI/CD: PiBooru

## 1. Git Workflow
To maintain a stable `main` branch, we follow a feature-branch workflow.

- **Main Branch**: Always deployable. Protected from direct pushes.
- **Feature Branches**: Named `feat/[feature-name]` or `fix/[bug-name]`.
- **Pre-Push Validation**: Before pushing to any branch, you MUST verify that:
    1. The code compiles and passes tests (`bun test`).
    2. The server starts successfully (`bun start`) without runtime errors.
- **Pull Requests**: Required for merging into `main`. Must pass CI checks (Lint, Typecheck, Test).

## 2. Commit Conventions
We use **Conventional Commits** to automate changelog generation and version bumping.

- `feat:` A new feature.
- `fix:` A bug fix.
- `docs:` Documentation only changes.
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc).
- `refactor:` A code change that neither fixes a bug nor adds a feature.
- `perf:` A code change that improves performance.
- `test:` Adding missing tests or correcting existing tests.
- `chore:` Changes to the build process or auxiliary tools and libraries.

## 3. CI Pipeline (GitHub Actions)
The `.github/workflows/ci.yml` pipeline runs on every PR and push to `main`.

### 3.1 Jobs
1. **Lint & Typecheck**:
   - `bun x tsc --noEmit`
   - `bun x eslint .` (if configured)
2. **Test**:
   - `bun test` (runs all `*.test.ts` files)
3. **Build Validation**:
   - `bun build src/client/index.ts --outdir public/dist` (ensures client-side bundling succeeds)

## 4. CD & Release Strategy
Since PiBooru is self-hosted (often on Raspberry Pi/ARM devices), the release focus is on artifact portability.

### 4.1 Automated Releases
On tagging a version (e.g., `v1.0.0`), a GitHub Action triggers:
1. **Binary Compilation**: Uses `bun build --compile --target=bun-linux-arm64 --outfile pibooru-linux-arm64` to create a standalone executable.
2. **Docker Build**: Pushes a multi-arch image (amd64, arm64) to GitHub Container Registry (GHCR).
3. **GitHub Release**: Uploads the binaries and a generated changelog.

### 4.2 Versioning
We strictly adhere to **Semantic Versioning (SemVer)**:
- **MAJOR**: Incompatible API changes or major architectural shifts.
- **MINOR**: Add functionality in a backwards-compatible manner.
- **PATCH**: Backwards-compatible bug fixes.

## 5. Environment Protection
- **Secrets**: API keys (if any) and production DB paths must never be committed. Use GitHub Secrets for CI/CD variables.
- **Lockfile**: `bun.lockb` (or `bun.lock`) must be committed to ensure deterministic dependency installation.
