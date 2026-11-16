import type { FC } from 'hono/jsx';
import type { Post } from '../db/schema';
import { HelpModal } from '../components/HelpModal';

interface ViewerProps {
  post: Post | null;
  tags: string;
  nextUrl: string | null;
  prevUrl: string | null;
}

/**
 * Immersive Media Viewer View
 * Optimized for full-screen immersion with an auto-hide overlay and mobile-friendly controls.
 */
export const Viewer: FC<ViewerProps> = ({ post, tags, nextUrl, prevUrl }) => {
  if (!post) {
    return (
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff;">
        <h2>No media found</h2>
        <p>Try broadening your search parameters.</p>
        <a href="/" class="button">Back to Gallery</a>
      </div>
    );
  }

  const isVideo = post.mime_type.startsWith('video/');
  const originalUrl = `/data/original/${post.hash.slice(0, 2)}/${post.hash.slice(2, 4)}/${post.hash}${post.extension}`;

  return (
    <div id="viewer-container" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden;">
      <style>{`
        #viewer-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          box-sizing: border-box;
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 16px 20px;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
          transform: translateY(100%);
          transition: transform 0.25s ease-out, opacity 0.25s ease-out;
          opacity: 0;
          z-index: 100;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        #viewer-container:hover #viewer-overlay,
        #viewer-overlay:focus-within,
        #viewer-overlay.visible {
          transform: translateY(0);
          opacity: 1;
        }
        .viewer-toggle-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 90;
          background: rgba(20, 20, 20, 0.75);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #eee;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: none;
        }
        .viewer-media {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .nav-link {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 15%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.2);
          text-decoration: none;
          font-size: 3rem;
          transition: background 0.2s, color 0.2s;
          z-index: 10;
        }
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
        }
        #prev-link { left: 0; }
        #next-link { right: 0; }
        
        #viewer-search-form {
          display: flex;
          gap: 10px;
          width: 100%;
          max-width: 600px;
          position: relative;
        }
        #viewer-search-form input {
          flex-grow: 1;
          min-width: 0;
          background: #222;
          border: 1px solid #444;
          color: #fff;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
        }
        #viewer-search-form button {
          background: #3b82f6;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          white-space: nowrap;
        }
        .viewer-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }
        .viewer-actions .button {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .viewer-toggle-btn {
            display: block;
          }
          #viewer-overlay {
            flex-direction: column;
            gap: 12px;
            padding: 12px 14px;
            padding-bottom: max(12px, env(safe-area-inset-bottom));
          }
          #viewer-search-form {
            max-width: 100%;
          }
          #viewer-search-form input {
            padding: 10px 12px;
            font-size: 14px;
          }
          #viewer-search-form button {
            padding: 10px 16px;
            font-size: 14px;
          }
          #viewer-suggestions-container {
            left: 0 !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .viewer-actions {
            width: 100%;
            gap: 8px;
          }
          .viewer-actions .button {
            flex: 1;
            text-align: center;
            padding: 10px;
            font-size: 14px;
            min-height: 44px;
          }
          .nav-link {
            width: 20%;
            font-size: 2.5rem;
          }
        }
      `}</style>

      {/* Mobile Menu Toggle Button */}
      <button 
        id="viewer-menu-toggle" 
        class="viewer-toggle-btn" 
        type="button" 
        aria-label="Toggle menu"
      >
        Menu
      </button>

      {isVideo ? (
        <video 
          src={originalUrl} 
          class="viewer-media"
          controls 
          autoplay
          loop
        />
      ) : (
        <img 
          src={originalUrl} 
          alt={`Post ${post.id}`}
          class="viewer-media"
        />
      )}

      {prevUrl && (
        <a href={prevUrl} id="prev-link" class="nav-link" hx-boost="true" rel="prev">‹</a>
      )}
      
      {nextUrl && (
        <a href={nextUrl} id="next-link" class="nav-link" hx-boost="true" rel="next">›</a>
      )}

      <div id="viewer-overlay">
        <form id="viewer-search-form" action="/viewer" method="get">
          <input 
            type="text" 
            name="tags" 
            placeholder="Search tags... (e.g. order:random)"
            value={tags}
            id="viewer-tags-input"
            autocomplete="off"
            hx-get="/partials/tags/suggestions"
            hx-trigger="keyup changed delay:100ms"
            hx-target="#viewer-suggestions-container"
          />
          <div id="viewer-suggestions-container" style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; background: #222; z-index: 110;"></div>
          <button type="submit">Search</button>
        </form>
        <div class="viewer-actions">
          <a href="/" class="button" style="background: #444;">Gallery</a>
          <a href={`/post/${post.id}`} class="button" style="background: #444;">Details</a>
        </div>
      </div>
    </div>
  );
};

export interface ViewerPageProps extends ViewerProps {}

/**
 * Full-page standalone wrapper for the viewer to avoid standard layout interference.
 */
export const ViewerPage: FC<ViewerPageProps> = (props) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Viewer - PiBooru</title>
        <link rel="stylesheet" href="/public/css/main.css?v=0.5.30" />
        <script src="/public/js/htmx.min.js" defer></script>
        <script src="/public/dist/index.js?v=0.5.30" defer></script>
      </head>
      <body hx-boost="true" style="margin: 0; padding: 0; background: #000; overflow: hidden;">
        <Viewer {...props} />
        <HelpModal />
      </body>
    </html>
  );
};

