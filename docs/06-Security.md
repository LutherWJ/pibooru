# Security: MyBooru

## 1. Overview
MyBooru is designed for secure self-hosting on private networks. Security is handled at three layers: supply chain, application logic, and filesystem integrity.

## 2. Supply Chain Security
- **Cryptographic Pinning**: All dependencies are locked and verified via `bun.lock`. This ensures every build is reproducible and safe from unauthorized dependency substitutions.
- **Local Assets**: All frontend libraries (HTMX, etc.) and CSS must be served locally from `/public` to ensure the application remains functional and secure without external internet access.

## 3. Input Validation (Zod)
- **Zero Trust**: All input (HTMX headers, query params, multipart forms) is treated as untrusted and validated via **Zod**.
- **Sanitization**: Search queries and tags are sanitized to prevent SQL injection (via SQLite's prepared statements) and XSS (via Hono JSX auto-escaping).

## 4. Web Protection
- **CSRF**: Hono's CSRF middleware is enabled. Since HTMX sends `HX-Request` headers, we ensure requests originate from the local UI.
- **CSP**: A strict Content Security Policy is enforced. `script-src 'self'` and `object-src 'none'` are the defaults.
- **Authentication**: While 1.0 is single-user, the architecture supports future-proofing with secure session cookies.

## 5. Environment & Deployment
- **Private Network Ready**: The application is optimized for environments like Tailscale. While the network handles the transport encryption (SSL), the application provides its own layer of validation.
- **Internal Rate Limiting**: Since private network proxies may not provide rate limiting, the application logic will include basic throttling for expensive operations like FFmpeg processing to prevent local resource exhaustion.
