import type { Context } from "hono";
import { deleteCookie, setSignedCookie } from "hono/cookie";
import { CONFIG } from "../util/config";
import { UserModel } from "../models/User";
import { Login } from "../views/Login";
import type { AppEnv } from "../types";

export class AuthController {
    static async showLogin(c: Context<AppEnv>) {
        return c.render(<Login />, { title: "Login" });
    }

    static async login(c: Context<AppEnv>) {
        const { username, password } = c.req.valid("form" as never) as { username: string; password: string };
        const user = await UserModel.verifyPassword(username, password);

        if (user) {
            await setSignedCookie(c, "session_id", user.id.toString(), CONFIG.COOKIE_SECRET, {
                httpOnly: true,
                secure: CONFIG.isProduction,
                sameSite: "Lax",
                maxAge: 60 * 60 * 24 * 30 // 30 days
            });
            return c.redirect("/");
        }

        return c.render(<Login error="Invalid username or password" />, { title: "Login" });
    }

    static async logout(c: Context<AppEnv>) {
        deleteCookie(c, "session_id");
        return c.redirect("/login");
    }
}
