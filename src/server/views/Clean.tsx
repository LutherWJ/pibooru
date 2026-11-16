import type { FC } from 'hono/jsx';
import type { Post } from '../db/schema';
import { HelpModal } from '../components/HelpModal';

export interface CleanProps {
  post: Post | null;
  tags: string;
  currentPage: string;
  nextUrl: string | null;
  prevUrl: string | null;
  totalCount: number;
  message?: string;
}

// Module-level styling constants following BETH conventions
const CONTAINER_STYLE = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #0a0a0a; color: #eee; display: flex; flex-direction: column; overflow: hidden; user-select: none;";
const TOPBAR_STYLE = "position: absolute; top: 0; left: 0; width: 100%; height: 50px; background: rgba(15, 15, 15, 0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; box-sizing: border-box; z-index: 50; border-bottom: 1px solid rgba(255, 255, 255, 0.08);";
const STAGE_STYLE = "position: relative; flex: 1; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; padding-top: 50px; padding-bottom: 70px; box-sizing: border-box;";
const DOCK_STYLE = "position: absolute; bottom: 0; left: 0; width: 100%; height: 70px; background: rgba(15, 15, 15, 0.9); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; box-sizing: border-box; z-index: 50; border-top: 1px solid rgba(255, 255, 255, 0.08);";

export const CleanStage: FC<CleanProps> = ({ 
  post, 
  tags, 
  currentPage, 
  nextUrl, 
  prevUrl, 
  totalCount, 
  message 
}) => {
  const isVideo = post?.mime_type.startsWith('video/') ?? false;
  const originalUrl = post 
    ? `/data/original/${post.hash.slice(0, 2)}/${post.hash.slice(2, 4)}/${post.hash}${post.extension}` 
    : '';

  return (
    <div 
      id="clean-container" 
      tabIndex={-1}
      style={`${CONTAINER_STYLE} outline: none;`}
      onclick="if (!event.target.closest('#clean-search-form, a, button, input')) { const active = document.activeElement; if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) active.blur(); }"
    >
      <style>{`
        .clean-media {
          max-width: 96vw;
          max-height: calc(100vh - 130px);
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease, filter 0.2s ease;
        }
        .clean-nav-link {
          position: absolute;
          top: 50px;
          bottom: 70px;
          width: 15%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.2);
          text-decoration: none;
          font-size: 3.5rem;
          transition: background 0.2s, color 0.2s;
          z-index: 20;
          cursor: pointer;
        }
        .clean-nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
        }
        #clean-prev-link { left: 0; }
        #clean-next-link { right: 0; }

        .clean-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          border: 1px solid transparent;
          text-decoration: none;
          transition: transform 0.1s ease, background-color 0.15s ease, border-color 0.15s ease;
        }
        .clean-btn:active {
          transform: scale(0.97);
        }
        .clean-btn kbd {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 3px;
          padding: 2px 5px;
          font-size: 11px;
          font-family: monospace;
          color: #fff;
        }

        .btn-prev {
          background: #262626;
          color: #ccc;
          border-color: #3b3b3b;
        }
        .btn-prev:hover {
          background: #333;
          color: #fff;
          text-decoration: none;
        }

        .btn-delete {
          background: #dc2626;
          color: #fff;
          border-color: #ef4444;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
        }
        .btn-delete:hover {
          background: #b91c1c;
          border-color: #dc2626;
        }

        .btn-keep {
          background: #2563eb;
          color: #fff;
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
        }
        .btn-keep:hover {
          background: #1d4ed8;
          color: #fff;
          text-decoration: none;
        }

        .clean-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #1f2937;
          border: 1px solid #374151;
          color: #93c5fd;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
        }

        .hud-pills {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #9ca3af;
        }
        .hud-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .hud-pill kbd {
          background: #1f2937;
          border: 1px solid #4b5563;
          border-radius: 4px;
          padding: 2px 6px;
          font-family: monospace;
          font-size: 11px;
          color: #f3f4f6;
        }

        .clean-toast {
          position: fixed;
          top: 65px;
          right: 20px;
          background: rgba(220, 38, 38, 0.95);
          color: #fff;
          padding: 10px 18px;
          border-radius: 6px;
          font-weight: 500;
          font-size: 13px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          z-index: 100;
          animation: toastIn 0.2s ease-out, toastOut 0.3s ease-in 2s forwards;
          pointer-events: none;
        }

        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }

        .cleaning-delete {
          opacity: 0 !important;
          transform: translateY(80px) scale(0.92) !important;
          filter: grayscale(1) drop-shadow(0 0 20px rgba(220, 38, 38, 0.8)) !important;
        }
        .cleaning-next {
          opacity: 0 !important;
          transform: translateX(-80px) scale(0.96) !important;
        }
        .cleaning-prev {
          opacity: 0 !important;
          transform: translateX(80px) scale(0.96) !important;
        }

        @media (max-width: 768px) {
          #clean-topbar {
            height: auto !important;
            padding: 8px 10px !important;
            flex-wrap: wrap;
            gap: 6px 10px;
          }
          .clean-topbar-left {
            gap: 8px !important;
          }
          .clean-badge {
            display: none !important;
          }
          .clean-dimensions {
            display: none !important;
          }
          #clean-search-form {
            order: 3;
            width: 100% !important;
            max-width: 100% !important;
            margin-top: 2px;
          }
          #clean-tags-input {
            font-size: 14px !important;
            padding: 8px 10px !important;
          }
          #clean-topbar .clean-btn {
            padding: 6px 10px !important;
            font-size: 12px !important;
            min-height: 36px;
          }
          #clean-stage {
            padding-top: 96px !important;
            padding-bottom: 74px !important;
          }
          .clean-media {
            max-height: calc(100vh - 175px) !important;
          }
          .hud-pills {
            display: none !important;
          }
          #clean-dock {
            height: auto !important;
            min-height: 60px;
            padding: 8px 12px !important;
            padding-bottom: max(8px, env(safe-area-inset-bottom)) !important;
          }
          .clean-actions {
            width: 100% !important;
            gap: 8px !important;
          }
          .clean-actions .clean-btn,
          .clean-actions button {
            flex: 1 !important;
            justify-content: center !important;
            min-height: 44px !important;
            padding: 8px 6px !important;
            font-size: 13px !important;
            box-sizing: border-box;
          }
          .clean-btn kbd {
            display: none !important;
          }
          .clean-nav-link {
            width: 18% !important;
            font-size: 2.5rem !important;
          }
        }
      `}</style>

      {/* Top Bar */}
      <header id="clean-topbar" style={TOPBAR_STYLE}>
        <div style="display: flex; align-items: center; gap: 14px;" class="clean-topbar-left">
          <a href="/" class="clean-btn btn-prev" style="padding: 4px 10px; font-size: 12px;">← Gallery</a>
          <span class="clean-badge">
            Clean Mode
          </span>
          {post && (
            <span style="font-size: 13px; color: #9ca3af;">
              Post <strong style="color: #fff;">#{post.id}</strong>
              {post.width && post.height && (
                <span class="clean-dimensions" style="margin-left: 8px; opacity: 0.7;">({post.width}×{post.height})</span>
              )}
            </span>
          )}
        </div>

        {/* Tag Filter Form */}
        <form 
          id="clean-search-form" 
          action="/clean" 
          method="get" 
          onsubmit="const inp = document.getElementById('clean-tags-input'); if (inp) inp.blur();"
          style="display: flex; align-items: center; gap: 8px; position: relative; width: 380px; max-width: 40vw;"
        >
          <input 
            type="text" 
            name="tags" 
            id="clean-tags-input"
            placeholder="Filter tags... (Press / to search)"
            value={tags}
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck={false}
            style="width: 100%; background: #1a1a1a; border: 1px solid #333; color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 14px;"
            hx-get="/partials/tags/suggestions"
            hx-trigger="input changed delay:100ms, keyup changed delay:100ms"
            hx-target="#clean-suggestions-container"
          />
          <div id="clean-suggestions-container" style="position: absolute; top: 100%; left: 0; width: 100%; background: #222; border: 1px solid #444; border-radius: 4px; z-index: 120; max-height: 250px; overflow-y: auto;"></div>
          <button type="submit" class="clean-btn btn-prev" style="padding: 6px 12px; font-size: 13px; min-height: 40px;">Filter</button>
        </form>

        <div style="display: flex; align-items: center; gap: 12px;" class="clean-topbar-right">
          <span style="font-size: 12px; color: #9ca3af;">
            Remaining: <strong style="color: #38bdf8;">{totalCount}</strong>
          </span>
          {post && (
            <a 
              href={`/post/${post.id}`} 
              class="clean-btn btn-prev" 
              style="padding: 6px 10px; font-size: 12px; min-height: 36px; display: inline-flex; align-items: center;"
              title="Open full post details"
            >
              Details ↗
            </a>
          )}
        </div>
      </header>

      {/* Main Content Stage */}
      {post ? (
        <main id="clean-stage" style={STAGE_STYLE}>
          {isVideo ? (
            <video 
              id="clean-media-element"
              src={originalUrl} 
              class="clean-media"
              controls 
              autoplay
              loop
              muted
            />
          ) : (
            <img 
              id="clean-media-element"
              src={originalUrl} 
              alt={`Post ${post.id}`}
              class="clean-media"
            />
          )}

          {/* Left / Right Click Nav Zones */}
          {prevUrl && (
            <a 
              id="clean-prev-link" 
              href={prevUrl} 
              hx-get={prevUrl}
              hx-target="#clean-container"
              hx-swap="outerHTML"
              hx-push-url="true"
              class="clean-nav-link" 
              rel="prev"
              title="Previous post (A / Q)"
            >
              ‹
            </a>
          )}
          
          {nextUrl && (
            <a 
              id="clean-next-link" 
              href={nextUrl} 
              hx-get={nextUrl}
              hx-target="#clean-container"
              hx-swap="outerHTML"
              hx-push-url="true"
              class="clean-nav-link" 
              rel="next"
              title="Next post (D / Space)"
            >
              ›
            </a>
          )}
        </main>
      ) : (
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;">
          <h2 style="font-size: 1.5rem; color: #fff; margin-bottom: 8px;">All Clean!</h2>
          <p style="color: #9ca3af; max-width: 400px; margin-bottom: 24px;">
            {tags ? `No more posts matching "${tags}".` : "No posts remaining to review in the board."}
          </p>
          <div style="display: flex; gap: 12px;">
            {tags && (
              <a href="/clean" class="clean-btn btn-prev">Clear Tag Filter</a>
            )}
            <a href="/" class="clean-btn btn-keep">Return to Gallery</a>
          </div>
        </div>
      )}

      {/* Toast Confirmation */}
      {message && (
        <div id="clean-toast" class="clean-toast">
          {message}
        </div>
      )}

      {/* Bottom Dock / HUD */}
      <footer id="clean-dock" style={DOCK_STYLE}>
        {/* Left-Handed Keystroke Guide */}
        <div class="hud-pills">
          <span style="color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
            Left-Handed Keys:
          </span>
          <span class="hud-pill"><kbd>A</kbd> / <kbd>Q</kbd> Prev</span>
          <span class="hud-pill"><kbd>D</kbd> / <kbd>Space</kbd> Keep</span>
          <span class="hud-pill"><kbd>S</kbd> / <kbd>X</kbd> <strong style="color: #f87171;">Delete & Next</strong></span>
          <span class="hud-pill"><kbd>Esc</kbd> Exit</span>
        </div>

        {/* Action Controls */}
        <div class="clean-actions" style="display: flex; align-items: center; gap: 12px;">
          {/* Previous Button */}
          {prevUrl ? (
            <a 
              id="clean-prev-btn" 
              href={prevUrl}
              hx-get={prevUrl}
              hx-target="#clean-container"
              hx-swap="outerHTML"
              hx-push-url="true"
              class="clean-btn btn-prev"
            >
              ◀ Prev <kbd>A</kbd>
            </a>
          ) : (
            <button class="clean-btn btn-prev" disabled style="opacity: 0.4; cursor: not-allowed;">
              ◀ Prev <kbd>A</kbd>
            </button>
          )}

          {/* Delete Button (Danger) */}
          {post && (
            <button 
              id="clean-delete-btn" 
              hx-delete={`/clean/post/${post.id}?tags=${encodeURIComponent(tags)}&page=${encodeURIComponent(currentPage)}`}
              hx-target="#clean-container"
              hx-swap="outerHTML"
              class="clean-btn btn-delete"
              title="Delete this post and advance to next (S or X)"
            >
              Delete <kbd>S / X</kbd>
            </button>
          )}

          {/* Keep / Next Button (Primary) */}
          {nextUrl ? (
            <a 
              id="clean-next-btn" 
              href={nextUrl}
              hx-get={nextUrl}
              hx-target="#clean-container"
              hx-swap="outerHTML"
              hx-push-url="true"
              class="clean-btn btn-keep"
            >
              Keep & Next ▶ <kbd>D / Space</kbd>
            </a>
          ) : (
            <button class="clean-btn btn-keep" disabled style="opacity: 0.4; cursor: not-allowed;">
              End of list
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export interface CleanPageProps extends CleanProps {}

/**
 * CleanPage Component
 * Full-page standalone wrapper for the Clean Slideshow UI.
 */
export const CleanPage: FC<CleanPageProps> = (props) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Clean Mode - PiBooru</title>
        <link rel="stylesheet" href="/public/css/main.css?v=0.5.30" />
        <script src="/public/js/htmx.min.js" defer></script>
        <script src="/public/dist/index.js?v=0.5.30" defer></script>
      </head>
      <body hx-boost="true" style="margin: 0; padding: 0; background: #0a0a0a; overflow: hidden;">
        <CleanStage {...props} />
        <HelpModal />
      </body>
    </html>
  );
};
