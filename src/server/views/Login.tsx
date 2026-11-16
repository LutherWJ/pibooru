import type { FC } from "hono/jsx";

const FORM_STYLE = "display: flex; flex-direction: column; gap: 1rem;";
const INPUT_STYLE = "width: 100%; padding: 0.75rem; background: #222; border: 1px solid #444; color: #eee; border-radius: 4px; min-height: 44px; box-sizing: border-box; font-size: 16px;";
const SUBMIT_BTN_STYLE = "padding: 0.75rem; color: white; background: #2563eb; cursor: pointer; border-radius: 4px; font-weight: bold; width: 100%; min-height: 48px; font-size: 15px; border: none;";
const ERROR_STYLE = "color: #ff6b6b; background: #2d1a1a; padding: 0.5rem; margin-bottom: 1rem; border-radius: 4px; font-size: 0.9rem;";
const SUCCESS_STYLE = "color: #6bff6b; background: #1a2d1a; padding: 0.5rem; margin-bottom: 1rem; border-radius: 4px; font-size: 0.9rem;";

interface LoginProps {
  error?: string;
  success?: string;
}

export const Login: FC<LoginProps> = ({ error, success }) => {
  return (
    <div class="auth-container">
      <h2 style="text-align: center; margin-bottom: 1.5rem;">Login</h2>

      {error && <div style={ERROR_STYLE}>{error}</div>}
      {success && <div style={SUCCESS_STYLE}>{success}</div>}

      <form action="/login" method="post" hx-boost="false" style={FORM_STYLE}>
        <div class="form-group">
          <label for="username" style="display: block; margin-bottom: 0.25rem;">Username</label>
          <input 
            type="text" 
            id="username" 
            name="username" 
            required 
            style={INPUT_STYLE}
          />
        </div>

        <div class="form-group">
          <label for="password" style="display: block; margin-bottom: 0.25rem;">Password</label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            required 
            style={INPUT_STYLE}
          />
        </div>

        <button 
          type="submit" 
          class="button" 
          style={SUBMIT_BTN_STYLE}
        >
          Login
        </button>
      </form>
    </div>
  );
};
