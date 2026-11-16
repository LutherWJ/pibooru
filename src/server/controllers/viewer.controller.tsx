import type { Context } from "hono";
import { SearchParser } from "../util/SearchParser";
import { PostModel } from "../models/Post";
import { ViewerPage } from "../views/Viewer";
import type { AppEnv } from "../types";

export class ViewerController {
    static async showViewer(c: Context<AppEnv>) {
        const { tags: tagsParam, page: pageStr } = c.req.valid("query" as never) as { tags: string; page: string };
        const query = SearchParser.parse(tagsParam);
        SearchParser.applyDefaultRating(query, c.var.user?.default_rating);
        const isRandom = query.order === "random";

        let offset = 0;
        if (!isRandom) {
            if (pageStr.startsWith("b")) {
                query.before_id = parseInt(pageStr.substring(1), 10);
            } else if (pageStr.startsWith("a")) {
                query.after_id = parseInt(pageStr.substring(1), 10);
            } else {
                const pageNum = parseInt(pageStr, 10) || 1;
                offset = (pageNum - 1);
            }
        }

        const posts = PostModel.search(query, 1, offset);
        const post = posts[0] || null;

        let nextUrl: string | null = null;
        let prevUrl: string | null = null;

        if (post) {
            if (isRandom) {
                const nextParams = new URLSearchParams();
                nextParams.set("tags", tagsParam);
                nextParams.set("_r", Math.random().toString(36).substring(7));
                nextUrl = `/viewer?${nextParams.toString()}`;
                prevUrl = "javascript:history.back()";
            } else {
                const hasPrev = PostModel.hasNewer(query, post.id);
                const hasNext = PostModel.hasOlder(query, post.id);

                const baseParams = new URLSearchParams();
                baseParams.set("tags", tagsParam);

                if (hasNext) {
                    const nextParams = new URLSearchParams(baseParams);
                    nextParams.set("page", `b${post.id}`);
                    nextUrl = `/viewer?${nextParams.toString()}`;
                }

                if (hasPrev) {
                    const prevParams = new URLSearchParams(baseParams);
                    prevParams.set("page", `a${post.id}`);
                    prevUrl = `/viewer?${prevParams.toString()}`;
                }
            }
        }

        return c.html(
            <ViewerPage 
                post={post} 
                tags={tagsParam} 
                nextUrl={nextUrl} 
                prevUrl={prevUrl} 
            />
        );
    }
}
