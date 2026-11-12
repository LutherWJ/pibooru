import type { FC } from "hono/jsx";

export const Offline: FC = () => {
    return (
        <div style="text-align: center; padding: 2rem;">
            <h2>You are offline</h2>
            <p>PiBooru is currently unavailable without an internet connection.</p>
            <a href="/" class="button">Try Again</a>
        </div>
    );
};
