import type { User } from "../db/schema";

export const Settings = ({ user, apiKey }: { user: User; apiKey: string | null }) => {
  return (
    <div class="settings-page" style="max-width: 800px; margin: 0 auto; padding: 2rem;">
      <h1>Settings</h1>
      
      <section style="background: #1e1e1e; padding: 1.5rem; border-radius: 8px; margin-top: 2rem;">
        <h2>API Access</h2>
        <p style="color: #a0a0a0; margin-bottom: 1.5rem;">
          Use this API key to authenticate scripts and third-party applications. 
          Keep it secret!
        </p>
        
        <div id="api-key-container" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem; background: #2d2d2d; padding: 1rem; border-radius: 4px; border: 1px solid #444;">
            <code id="api-key-display" style="flex-grow: 1; font-family: monospace; font-size: 1.1rem; color: #60a5fa;">
              {apiKey || "None generated yet"}
            </code>
            <button 
              hx-post="/settings/rotate-api-key"
              hx-target="#api-key-container"
              hx-swap="outerHTML"
              class="button"
              style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;"
            >
              {apiKey ? "Rotate Key" : "Generate Key"}
            </button>
          </div>
          {apiKey && (
            <div style="font-size: 0.9rem; color: #ef4444;">
              Warning: Rotating your API key will invalidate the old one immediately.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export const ApiKeyFragment = ({ apiKey }: { apiKey: string }) => {
  return (
    <div id="api-key-container" style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 1rem; background: #2d2d2d; padding: 1rem; border-radius: 4px; border: 1px solid #444;">
        <code id="api-key-display" style="flex-grow: 1; font-family: monospace; font-size: 1.1rem; color: #60a5fa;">
          {apiKey}
        </code>
        <button 
          hx-post="/settings/rotate-api-key"
          hx-target="#api-key-container"
          hx-swap="outerHTML"
          class="button"
          style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;"
        >
          Rotate Key
        </button>
      </div>
      <div style="font-size: 0.9rem; color: #ef4444;">
        Warning: Rotating your API key will invalidate the old one immediately.
      </div>
    </div>
  );
};
