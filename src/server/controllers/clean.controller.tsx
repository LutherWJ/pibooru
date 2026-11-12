import type { Context } from "hono";
import { SearchParser } from "../util/SearchParser";
import { PostModel } from "../models/Post";
import { CleanPage, CleanStage } from "../views/Clean";
import type { AppEnv } from "../types";

export class CleanController {
  static async showClean(c: Context<AppEnv>) {
    const { tags: tagsParam, page: pageStr } = c.req.valid("query" as never) as { tags: string; page: string };
    const query = SearchParser.parse(tagsParam);
    const isRandom = query.order === "random";

    let offset = 0;
    if (!isRandom) {
      if (pageStr.startsWith("b")) {
        query.before_id = parseInt(pageStr.substring(1), 10);
      } else if (pageStr.startsWith("a")) {
        query.after_id = parseInt(pageStr.substring(1), 10);
      } else {
        const pageNum = parseInt(pageStr, 10) || 1;
        offset = pageNum - 1;
      }
    }

    const totalCount = PostModel.count(SearchParser.parse(tagsParam));
    const posts = PostModel.search(query, 1, offset);
    const post = posts[0] || null;

    let nextUrl: string | null = null;
    let prevUrl: string | null = null;

    if (post) {
      if (isRandom) {
        const nextParams = new URLSearchParams();
        if (tagsParam) nextParams.set("tags", tagsParam);
        nextParams.set("_r", Math.random().toString(36).substring(7));
        nextUrl = `/clean?${nextParams.toString()}`;
        prevUrl = null;
      } else {
        const hasPrev = PostModel.hasNewer(query, post.id);
        const hasNext = PostModel.hasOlder(query, post.id);

        const baseParams = new URLSearchParams();
        if (tagsParam) baseParams.set("tags", tagsParam);

        if (hasNext) {
          const nextParams = new URLSearchParams(baseParams);
          nextParams.set("page", `b${post.id}`);
          nextUrl = `/clean?${nextParams.toString()}`;
        }

        if (hasPrev) {
          const prevParams = new URLSearchParams(baseParams);
          prevParams.set("page", `a${post.id}`);
          prevUrl = `/clean?${prevParams.toString()}`;
        }
      }
    }

    const isHtmx = c.req.header("hx-request") === "true";
    const isBoosted = c.req.header("hx-boosted") === "true";
    const target = c.req.header("hx-target");

    // Partial swap if requested directly by HTMX targeting clean-container
    if (isHtmx && (!isBoosted || target === "clean-container")) {
      return c.html(
        <CleanStage
          post={post}
          tags={tagsParam}
          currentPage={pageStr}
          nextUrl={nextUrl}
          prevUrl={prevUrl}
          totalCount={totalCount}
        />
      );
    }

    // Full page render for initial/direct visits or boosted navigation
    return c.html(
      <CleanPage
        post={post}
        tags={tagsParam}
        currentPage={pageStr}
        nextUrl={nextUrl}
        prevUrl={prevUrl}
        totalCount={totalCount}
      />
    );
  }

  static async deletePost(c: Context<AppEnv>) {
    const { id } = c.req.valid("param" as never) as { id: number };
    const { tags: tagsParam, page: pageStr } = c.req.valid("query" as never) as { tags: string; page: string };

    // Delete post from DB and filesystem
    await PostModel.delete(id);

    // Find the next post in sequence matching the tags
    const query = SearchParser.parse(tagsParam);
    let nextPosts = PostModel.search({ ...query, before_id: id }, 1);
    
    // If no older post exists, check for newer posts
    if (nextPosts.length === 0) {
      nextPosts = PostModel.search({ ...query, after_id: id }, 1);
    }

    // Fallback: check any remaining post
    if (nextPosts.length === 0) {
      nextPosts = PostModel.search(query, 1);
    }

    const nextPost = nextPosts[0] || null;
    const remainingCount = PostModel.count(query);

    let nextUrl: string | null = null;
    let prevUrl: string | null = null;
    let currentUrl = "/clean";

    const baseParams = new URLSearchParams();
    if (tagsParam) baseParams.set("tags", tagsParam);

    if (nextPost) {
      const hasPrev = PostModel.hasNewer(query, nextPost.id);
      const hasNext = PostModel.hasOlder(query, nextPost.id);

      const currentParams = new URLSearchParams(baseParams);
      currentParams.set("page", `b${nextPost.id}`);
      currentUrl = `/clean?${currentParams.toString()}`;

      if (hasNext) {
        const nextParams = new URLSearchParams(baseParams);
        nextParams.set("page", `b${nextPost.id}`);
        nextUrl = `/clean?${nextParams.toString()}`;
      }

      if (hasPrev) {
        const prevParams = new URLSearchParams(baseParams);
        prevParams.set("page", `a${nextPost.id}`);
        prevUrl = `/clean?${prevParams.toString()}`;
      }
    } else {
      currentUrl = tagsParam ? `/clean?tags=${encodeURIComponent(tagsParam)}` : "/clean";
    }

    const isHtmx = c.req.header("hx-request") === "true";

    if (isHtmx) {
      c.header("HX-Push-Url", currentUrl);
      return c.html(
        <CleanStage
          post={nextPost}
          tags={tagsParam}
          currentPage={nextPost ? `b${nextPost.id}` : "1"}
          nextUrl={nextUrl}
          prevUrl={prevUrl}
          totalCount={remainingCount}
          message={`Post #${id} deleted`}
        />
      );
    }

    return c.redirect(currentUrl);
  }
}
