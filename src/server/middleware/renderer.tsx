import { jsxRenderer } from 'hono/jsx-renderer';
import { HelpModal } from '../components/HelpModal';

declare module 'hono' {
  interface ContextRenderer {
    (content: string | Promise<string>, props?: { title?: string }): Response | Promise<Response>
  }
}

interface RendererProps {
  title?: string;
}

/**
 * PiBooru Global Layout Renderer
 * Refactored to match Danbooru's classic layout and Dark Theme.
 */
export const renderer = jsxRenderer(({ children, title }: RendererProps & { children?: any }, c) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} - PiBooru` : "PiBooru"}</title>
        
        <link rel="stylesheet" href="/public/css/main.css" />
        <script src="/public/js/htmx.min.js" defer></script>
        <script src="/public/dist/index.js" defer></script>
      </head>
      <body hx-boost="true">
        <header id="top">
          <h1><a href="/">PiBooru</a></h1>
          <menu>
            <li><a href="/">Posts</a></li>
            <li><a href="/tags">Tags</a></li>
            <li><a href="/upload">Upload</a></li>
            <li><a href="#" id="help-link">Help (?)</a></li>
            {c.var.user ? (
              <>
                <li class="user-info" style="margin-left: auto;">
                  <span>{c.var.user.username}</span>
                </li>
                <li><a href="/logout" hx-boost="false">Logout</a></li>
              </>
            ) : (
              <li style="margin-left: auto;"><a href="/login" hx-boost="false">Login</a></li>
            )}
          </menu>
        </header>

        <nav id="nav">
          <menu>
            <li><a href="/">Listing</a></li>
            <li><a href="/upload">Upload</a></li>
            <li><a href="/wiki_pages">Wiki</a></li>
          </menu>
        </nav>

        <div id="page">
          {children}
        </div>

        <footer>
          <p>© 2026 PiBooru - Inspired by Danbooru</p>
        </footer>

        <HelpModal />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        ` }} />
      </body>
    </html>
  );
}, {
  docType: true
});
