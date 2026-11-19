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
 * Preserves Danbooru's classic layout on desktop, while providing
 * a native-feeling mobile PWA experience with bottom navigation and app bar.
 */
export const renderer = jsxRenderer(({ children, title }: RendererProps & { children?: any }, c) => {
  const currentPath = c.req.path || '/';
  const isSubPage = currentPath !== '/' && currentPath !== '';

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <title>{title ? `${title} - PiBooru` : "PiBooru"}</title>
        
        {/* PWA & Mobile Web App Meta */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#151515" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PiBooru" />
        <link rel="apple-touch-icon" href="/public/icons/icon-192.svg" />
        
        <link rel="stylesheet" href="/public/css/main.css?v=0.6.1" />
        <script src="/public/js/htmx.min.js" defer></script>
        <script src="/public/dist/index.js?v=0.6.1" defer></script>
      </head>
      <body hx-boost="true">
        {/* Top Header: Desktop Dual Bar + Mobile App Bar */}
        <header id="top">
          {/* Mobile Header Bar */}
          <div class="mobile-header-bar">
            {isSubPage ? (
              <button type="button" id="mobile-back-btn" class="mobile-header-btn" aria-label="Go Back">
                ←
              </button>
            ) : (
              <span class="mobile-header-spacer"></span>
            )}
            
            <h1 class="mobile-header-title">
              <a href="/">PiBooru</a>
            </h1>

            <div class="mobile-header-actions">
              <button type="button" id="mobile-search-toggle" class="mobile-header-btn" aria-label="Toggle Search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Consolidated Header */}
          <div class="desktop-header-bar">
            <h1><a href="/">PiBooru</a></h1>
            <menu>
              <li><a href="/" class={currentPath === '/' ? 'active' : ''}>Posts</a></li>
              <li><a href="/clean" class={currentPath.startsWith('/clean') ? 'active' : ''}>Clean</a></li>
              <li><a href="/tags" class={currentPath.startsWith('/tags') || currentPath.startsWith('/tag/') ? 'active' : ''}>Tags</a></li>
              <li><a href="/upload" class={currentPath.startsWith('/upload') ? 'active' : ''}>Upload</a></li>
              <li><a href="/wiki_pages" class={currentPath.startsWith('/wiki') ? 'active' : ''}>Wiki</a></li>
              <li><a href="#" id="help-link">Help (?)</a></li>
              {c.var.user ? (
                <>
                  <li class="user-info" style="margin-left: auto;">
                    <span>{c.var.user.username}</span>
                  </li>
                  <li><a href="/settings" class={currentPath.startsWith('/settings') ? 'active' : ''}>Settings</a></li>
                  <li><a href="/logout" hx-boost="false">Logout</a></li>
                </>
              ) : (
                <li style="margin-left: auto;"><a href="/login" hx-boost="false">Login</a></li>
              )}
            </menu>
          </div>
        </header>

        {/* Mobile Slide-down Search Drawer */}
        <div id="mobile-search-drawer" class="mobile-search-drawer">
          <form action="/" method="get" class="mobile-search-form">
            <input 
              type="text" 
              name="tags" 
              id="mobile-tags-input"
              placeholder="Search tags... (e.g. cat order:random)" 
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck={false}
              hx-get="/partials/tags/suggestions"
              hx-trigger="input changed delay:100ms, keyup changed delay:100ms"
              hx-target="#mobile-suggestions-container"
            />
            <div id="mobile-suggestions-container" class="mobile-suggestions-box"></div>
            <div class="mobile-search-btn-row">
              <button type="submit" class="button" style="flex: 1; min-height: 44px; background: #2563eb; color: #fff; border: none; font-weight: bold;">Search</button>
              <a href="/clean" class="button" style="min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 0 16px;">Clean</a>
            </div>
          </form>
        </div>

        <div id="page">
          {children}
        </div>

        <footer>
          <p>© 2026 PiBooru - Inspired by Danbooru</p>
        </footer>

        {/* Mobile Fixed Bottom Navigation Bar (Hidden on Desktop) */}
        <nav id="mobile-bottom-nav" aria-label="Mobile Navigation">
          <a href="/" class={`bottom-nav-item ${currentPath === '/' ? 'active' : ''}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Gallery</span>
          </a>
          <a href="/clean" class={`bottom-nav-item ${currentPath.startsWith('/clean') ? 'active' : ''}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Clean</span>
          </a>
          <a href="/upload" class={`bottom-nav-item ${currentPath.startsWith('/upload') ? 'active' : ''}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Upload</span>
          </a>
          <a href="/tags" class={`bottom-nav-item ${currentPath.startsWith('/tags') || currentPath.startsWith('/tag/') ? 'active' : ''}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            <span>Tags</span>
          </a>
          <a href={c.var.user ? "/settings" : "/login"} class={`bottom-nav-item ${currentPath.startsWith('/settings') || currentPath.startsWith('/login') ? 'active' : ''}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>{c.var.user ? "Settings" : "Login"}</span>
          </a>
        </nav>

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
