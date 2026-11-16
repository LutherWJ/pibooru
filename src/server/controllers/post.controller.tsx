import type { Context } from "hono";
import { SearchParser } from "../util/SearchParser";
import { PostModel } from "../models/Post";
import { Home } from "../views/Home";
import { PostDetail } from "../views/PostDetail";
import type { AppEnv } from "../types";

export class PostController {
    static async listPosts(c: Context<AppEnv>) {
        const { tags: tagsParam, page: pageStr } = c.req.valid("query" as never) as { tags: string; page: string };
        const limit = 50;
        let offset = 0;
        const query = SearchParser.parse(tagsParam);

        // Hybrid pagination handling
        let pageNum = 1;
        if (pageStr.startsWith("b")) {
            query.before_id = parseInt(pageStr.substring(1), 10);
        } else if (pageStr.startsWith("a")) {
            query.after_id = parseInt(pageStr.substring(1), 10);
        } else {
            pageNum = parseInt(pageStr, 10) || 1;
            offset = (pageNum - 1) * limit;
        }

        const posts = PostModel.search(query, limit, offset);
        const totalCount = PostModel.count(query);
        const relatedTags = PostModel.getRelatedTags(query);

        // Robust pagination state
        let hasPrev = false;
        let hasNext = false;
        if (posts.length > 0) {
            const firstPostId = (posts[0] as any).id;
            const lastPostId = (posts[posts.length - 1] as any).id;
            hasPrev = PostModel.hasNewer(query, firstPostId);
            hasNext = PostModel.hasOlder(query, lastPostId);
        }

        return c.render(
            <Home
                posts={posts}
                tags={relatedTags}
                searchQuery={tagsParam}
                currentPage={pageStr}
                totalCount={totalCount}
                limit={limit}
                hasPrev={hasPrev}
                hasNext={hasNext}
            />
        );
    }

    static async showPost(c: Context<AppEnv>) {
        const { id } = c.req.valid("param" as never) as { id: number };
        const queryParams = c.req.valid("query" as never) as { tags?: string } | undefined;
        const tagsParam = queryParams?.tags || "";
        const post = PostModel.getById(id);

        if (!post) {
            return c.notFound();
        }

        const tags = PostModel.getTags(id);
        const searchQuery = tagsParam ? SearchParser.parse(tagsParam) : undefined;
        const { prevId, nextId } = PostModel.getAdjacentPostIds(id, searchQuery);

        return c.render(
            <PostDetail 
                post={post} 
                tags={tags} 
                prevPostId={prevId} 
                nextPostId={nextId} 
                searchQuery={tagsParam} 
            />, 
            {
                title: `Post ${id}`,
            }
        );
    }

    static async updateTags(c: Context<AppEnv>) {
        const { id } = c.req.valid("param" as never) as { id: number };
        const { tags } = c.req.valid("form" as never) as { tags: string };
        PostModel.updateTags(id, tags);

        const url = `/post/${id}`;
        if (c.req.header('hx-request')) {
            c.header('HX-Replace-Url', url);
        }
        return c.redirect(url);
    }

    static async deletePost(c: Context<AppEnv>) {
        const { id } = c.req.valid("param" as never) as { id: number };
        await PostModel.delete(id);
        if (c.req.header('hx-request')) {
            c.header('HX-Redirect', '/');
            return c.text('Deleted');
        }
        return c.redirect("/");
    }
}
