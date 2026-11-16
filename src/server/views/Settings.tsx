import type { FC } from "hono/jsx";
import type { User } from "../db/schema";

const PAGE_CONTAINER_STYLE = "max-width: 800px; margin: 0 auto; padding: 2rem;";
const CARD_SECTION_STYLE = "background: #1e1e1e; padding: 1.5rem; border-radius: 8px; margin-top: 2rem;";
const CONTAINER_STYLE = "display: flex; flex-direction: column; gap: 1rem;";
const KEY_BOX_STYLE = "display: flex; align-items: center; gap: 1rem; background: #2d2d2d; padding: 1rem; border-radius: 4px; border: 1px solid #444;";
const KEY_CODE_STYLE = "flex-grow: 1; font-family: monospace; font-size: 1.1rem; color: #60a5fa;";
const BTN_ROTATE_STYLE = "background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;";
const WARNING_STYLE = "font-size: 0.9rem; color: #ef4444;";

export const ApiKeyFragment: FC<{ apiKey: string }> = ({ apiKey }) => {
  return (
    <div id="api-key-container" style={CONTAINER_STYLE}>
      <div style={KEY_BOX_STYLE}>
        <code id="api-key-display" style={KEY_CODE_STYLE}>
          {apiKey || "None generated yet"}
        </code>
        <button 
          hx-post="/settings/rotate-api-key"
          hx-target="#api-key-container"
          hx-swap="outerHTML"
          class="button"
          style={BTN_ROTATE_STYLE}
        >
          {apiKey ? "Rotate Key" : "Generate Key"}
        </button>
      </div>
      {apiKey && (
        <div style={WARNING_STYLE}>
          Warning: Rotating your API key will invalidate the old one immediately.
        </div>
      )}
    </div>
  );
};

export const Settings: FC<{ user: User; apiKey: string | null }> = ({ user, apiKey }) => {
  return (
    <div class="settings-page" style={PAGE_CONTAINER_STYLE}>
      <h1>Settings</h1>
      
      <section style={CARD_SECTION_STYLE}>
        <h2>API Access</h2>
        <p style="color: #a0a0a0; margin-bottom: 1.5rem;">
          Use this API key to authenticate scripts and third-party applications. 
          Keep it secret!
        </p>
        
        <ApiKeyFragment apiKey={apiKey || ""} />
      </section>
    </div>
  );
};
