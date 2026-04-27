import { FC } from "hono/jsx";

interface LoginProps {
  error?: string;
  success?: string;
  mode?: "login" | "register";
}

export const Login: FC<LoginProps> = ({ error, success, mode = "login" }) => {
  return (
    <div class="auth-container" style="max-width: 400px; margin: 2rem auto; padding: 1rem; border: 1px solid #333; border-radius: 4px; background: #1a1a1a;">
      <h2 style="text-align: center; margin-bottom: 1.5rem;">{mode === "login" ? "Login" : "Register"}</h2>

      {error && <div style="color: #ff6b6b; background: #2d1a1a; padding: 0.5rem; margin-bottom: 1rem; border-radius: 4px; font-size: 0.9rem;">{error}</div>}
      {success && <div style="color: #6bff6b; background: #1a2d1a; padding: 0.5rem; margin-bottom: 1rem; border-radius: 4px; font-size: 0.9rem;">{success}</div>}

      <form action={mode === "login" ? "/login" : "/register"} method="POST" style="display: flex; flex-direction: column; gap: 1rem;">
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
          style="padding: 0.75rem; background: #444; color: white; border: none; cursor: pointer; border-radius: 2px; font-weight: bold;"
        >
          {mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>

      <div style="margin-top: 1.5rem; text-align: center; font-size: 0.9rem; color: #aaa;">
        {mode === "login" ? (
          <>
            Don't have an account? <a href="/register" style="color: #eee; text-decoration: underline;">Register here</a>
          </>
        ) : (
          <>
            Already have an account? <a href="/login" style="color: #eee; text-decoration: underline;">Login here</a>
          </>
        )}
      </div>
    </div>
  );
};
