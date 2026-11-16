import type { Context } from "hono";
import { UserModel } from "../models/User";
import { Settings, ApiKeyFragment, ContentFilterFragment } from "../views/Settings";
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

    static async updateContentFilter(c: Context<AppEnv>) {
        const user = c.var.user;
        const { default_rating } = c.req.valid("form" as never) as { default_rating: string };
        UserModel.updateDefaultRating(user.id, default_rating);
        user.default_rating = default_rating as any;
        return c.html(<ContentFilterFragment defaultRating={default_rating} message="Preference saved successfully!" />);
    }
}
