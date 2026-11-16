import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { PostController } from "../controllers/post.controller";
import type { AppEnv } from "../types";

export const postRouter = new Hono<AppEnv>();

postRouter.get(
    "/",
    zValidator(
        "query",
        z.object({
            tags: z.string().optional().default(""),
            page: z.string().optional().default("1"),
        })
    ),
    PostController.listPosts
);

postRouter.get(
    "/post/:id",
    zValidator(
        "param",
        z.object({
            id: z.string().transform((v) => parseInt(v, 10)),
        })
    ),
    zValidator(
        "query",
        z.object({
            tags: z.string().optional().default(""),
        })
    ),
    PostController.showPost
);

postRouter.post(
    "/post/:id/tags",
    zValidator("param", z.object({ id: z.string().transform((v) => parseInt(v, 10)) })),
    zValidator("form", z.object({ tags: z.string() })),
    PostController.updateTags
);

postRouter.delete(
    "/post/:id",
    zValidator("param", z.object({ id: z.string().transform((v) => parseInt(v, 10)) })),
    PostController.deletePost
);
