import type { FC } from "hono/jsx";

interface LoginProps {
  error?: string;
  success?: string;
}

export const Login: FC<LoginProps> = ({ error, success }) => {
  return (
    <div class="auth-container">
      <h2 style="text-align: center; margin-bottom: 1.5rem;">Login</h2>

      {error && <div style="color: #ff6b6b; background: #2d1a1a; padding: 0.5rem; margin-bottom: 1rem; border-radius: 4px; font-size: 0.9rem;">{error}</div>}
      {success && <div style="color: #6bff6b; background: #1a2d1a; padding: 0.5rem; margin-bottom: 1rem; border-radius: 4px; font-size: 0.9rem;">{success}</div>}

      <form action="/login" method="post" hx-boost="false" style="display: flex; flex-direction: column; gap: 1rem;">
        <div class="form-group">
          <label for="username" style="display: block; margin-bottom: 0.25rem;">Username</label>
          <input 
            type="text" 
            id="username" 
            name="username" 
            required 
            style="width: 100%; padding: 0.5rem; background: #222; border: 1px solid #444; color: #eee; border-radius: 2px;"
          />
        </div>

        <div class="form-group">
          <label for="password" style="display: block; margin-bottom: 0.25rem;">Password</label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            required 
            style="width: 100%; padding: 0.5rem; background: #222; border: 1px solid #444; color: #eee; border-radius: 2px;"
          />
        </div>

        <button 
          type="submit" 
          class="button" 
          style="padding: 0.75rem; color: white; cursor: pointer; border-radius: 2px; font-weight: bold; width: 100%;"
        >
          Login
        </button>
      </form>
    </div>
  );
};
