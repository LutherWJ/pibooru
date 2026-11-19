import type { FC } from "hono/jsx";
import type { User } from "../db/schema";

const PAGE_CONTAINER_STYLE = "max-width: 800px; margin: 0 auto; padding: 1rem; width: 100%; box-sizing: border-box;";
const CARD_SECTION_STYLE = "background: #1e1e1e; padding: 1.5rem; border-radius: 8px; margin-top: 1.5rem;";
const CONTAINER_STYLE = "display: flex; flex-direction: column; gap: 1rem;";
const KEY_BOX_STYLE = "display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; background: #2d2d2d; padding: 1rem; border-radius: 4px; border: 1px solid #444;";
const KEY_CODE_STYLE = "flex-grow: 1; font-family: monospace; font-size: 1.1rem; color: #60a5fa; word-break: break-all;";
const BTN_ROTATE_STYLE = "background: #2563eb; color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 4px; cursor: pointer; min-height: 44px; font-weight: bold; font-size: 14px;";
const WARNING_STYLE = "font-size: 0.9rem; color: #ef4444;";

const BTN_ACTION_STYLE = "background: #334155; color: white; border: none; padding: 0.75rem 1rem; border-radius: 4px; cursor: pointer; min-height: 44px; font-weight: bold; font-size: 13px; display: inline-flex; align-items: center; justify-content: center;";

export const ApiKeyFragment: FC<{ apiKey: string }> = ({ apiKey }) => {
  return (
    <div id="api-key-container" style={CONTAINER_STYLE}>
      <div style={KEY_BOX_STYLE}>
        {apiKey ? (
          <>
            <div style="flex-grow: 1; display: flex; align-items: center; min-width: 200px;">
              <code 
                id="api-key-display" 
                data-key={apiKey}
                data-masked="true"
                style={KEY_CODE_STYLE}
              >
                ••••••••••••••••••••••••••••••••
              </code>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button
                type="button"
                id="copy-api-key-btn"
                class="button"
                style={BTN_ACTION_STYLE}
                onclick={`
                  const el = document.getElementById('api-key-display');
                  const key = el ? el.getAttribute('data-key') : '';
                  if (key) {
                    navigator.clipboard.writeText(key).then(() => {
                      const btn = document.getElementById('copy-api-key-btn');
                      if (btn) {
                        const originalText = btn.textContent;
                        btn.textContent = 'Copied! ✓';
                        btn.style.background = '#16a34a';
                        setTimeout(() => {
                          btn.textContent = originalText;
                          btn.style.background = '#334155';
                        }, 2000);
                      }
                    });
                  }
                `}
              >
                Copy Key
              </button>
              <button
                type="button"
                id="toggle-reveal-key-btn"
                class="button"
                style={BTN_ACTION_STYLE}
                onclick={`
                  const el = document.getElementById('api-key-display');
                  const btn = document.getElementById('toggle-reveal-key-btn');
                  if (el && btn) {
                    const isMasked = el.getAttribute('data-masked') === 'true';
                    if (isMasked) {
                      el.textContent = el.getAttribute('data-key') || '';
                      el.setAttribute('data-masked', 'false');
                      btn.textContent = 'Hide';
                    } else {
                      el.textContent = '••••••••••••••••••••••••••••••••';
                      el.setAttribute('data-masked', 'true');
                      btn.textContent = 'Reveal';
                    }
                  }
                `}
              >
                Reveal
              </button>
              <button 
                hx-post="/settings/rotate-api-key"
                hx-target="#api-key-container"
                hx-swap="outerHTML"
                hx-confirm="Are you sure you want to rotate your API key? The current key will stop working immediately."
                class="button"
                style={BTN_ROTATE_STYLE}
              >
                Rotate Key
              </button>
            </div>
          </>
        ) : (
          <>
            <code style={KEY_CODE_STYLE}>None generated yet</code>
            <button 
              hx-post="/settings/rotate-api-key"
              hx-target="#api-key-container"
              hx-swap="outerHTML"
              class="button"
              style={BTN_ROTATE_STYLE}
            >
              Generate Key
            </button>
          </>
        )}
      </div>
      {apiKey && (
        <div style={WARNING_STYLE}>
          Warning: Rotating your API key will invalidate the old one immediately.
        </div>
      )}
    </div>
  );
};

export const ContentFilterFragment: FC<{ defaultRating: string; message?: string }> = ({ defaultRating, message }) => {
  return (
    <div id="content-filter-container">
      <form 
        hx-post="/settings/content-filter" 
        hx-target="#content-filter-container" 
        hx-swap="outerHTML" 
        style="display: flex; flex-direction: column; gap: 1rem; max-width: 500px;"
      >
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <label for="default-rating-select" style="font-weight: bold; font-size: 14px;">Default Content Rating Level</label>
          <select 
            id="default-rating-select" 
            name="default_rating"
            style="background: #000; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 10px 12px; font-size: 15px; min-height: 44px; width: 100%; box-sizing: border-box;"
          >
            <option value="all" selected={defaultRating === 'all'}>Show Everything (Safe, Questionable, Explicit)</option>
            <option value="s" selected={defaultRating === 's'}>Safe / General Audience Only (Hide Questionable & Explicit)</option>
            <option value="s_q" selected={defaultRating === 's_q'}>Safe & Questionable (Hide Explicit)</option>
            <option value="q_e" selected={defaultRating === 'q_e'}>Questionable & Explicit (Show Explicit and up)</option>
            <option value="e" selected={defaultRating === 'e'}>Explicit Only (Adult content only)</option>
          </select>
        </div>
        <button 
          type="submit" 
          class="button" 
          style="background: #2563eb; color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 4px; cursor: pointer; min-height: 44px; font-weight: bold; font-size: 14px; align-self: flex-start;"
        >
          Save Preference
        </button>
        {message && (
          <div style="color: #4ade80; font-size: 0.95rem; font-weight: bold;">
            ✓ {message}
          </div>
        )}
      </form>
    </div>
  );
};

export const Settings: FC<{ user: User; apiKey: string | null }> = ({ user, apiKey }) => {
  return (
    <div class="settings-page" style={PAGE_CONTAINER_STYLE}>
      <h1>Settings</h1>
      
      <section style={CARD_SECTION_STYLE}>
        <h2>Content Preferences</h2>
        <p style="color: #a0a0a0; margin-bottom: 1.5rem;">
          Choose which content rating level is displayed by default across the gallery, clean mode, and viewer when no specific rating is searched.
        </p>
        
        <ContentFilterFragment defaultRating={user.default_rating || "all"} />
      </section>

      <section style={CARD_SECTION_STYLE}>
        <h2>API Access</h2>
        <p style="color: #a0a0a0; margin-bottom: 1.5rem;">
          Use this API key to authenticate scripts and third-party applications. Keep it secret!
          Check the <a href="/wiki/api" style="color: #38bdf8; font-weight: bold; text-decoration: underline;">REST API Reference</a> for endpoint documentation and script examples.
        </p>
        
        <ApiKeyFragment apiKey={apiKey || ""} />
      </section>
    </div>
  );
};
