import type { Context } from "hono";
import { UserModel } from "../models/User";
import { Settings, ApiKeyFragment } from "../views/Settings";
import type { AppEnv } from "../types";

export class SettingsController {
    static async showSettings(c: Context<AppEnv>) {
        const user = c.var.user;
        return c.render(<Settings user={user} apiKey={user.api_key || null} />, { title: "Settings" });
    }

    static async rotateApiKey(c: Context<AppEnv>) {
        const user = c.var.user;
        const newKey = UserModel.generateApiKey(user.id);
        return c.html(<ApiKeyFragment apiKey={newKey} />);
    }
}
