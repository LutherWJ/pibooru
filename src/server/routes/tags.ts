import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { TagController } from "../controllers/tag.controller";
import type { AppEnv } from "../types";

export const tagRouter = new Hono<AppEnv>();

tagRouter.get(
    "/partials/tags/suggestions",
    zValidator(
        "query",
        z.object({
            q: z.string().optional(),
            tags: z.string().optional(),
        })
    ),
    TagController.suggestTags
);

tagRouter.get(
    "/tags",
    zValidator(
        "query",
        z.object({
            q: z.string().optional().default(""),
            page: z.string().optional().default("1"),
        })
    ),
    TagController.listTags
);

tagRouter.get(
    "/tag/:name",
    zValidator("param", z.object({ name: z.string() })),
    TagController.showTag
);

tagRouter.post(
    "/api/tags/:name/alias",
    zValidator("param", z.object({ name: z.string() })),
    zValidator("form", z.object({ alias: z.string() })),
    TagController.addAlias
);

tagRouter.delete(
    "/api/tags/:name/alias/:alias_name",
    zValidator("param", z.object({ name: z.string(), alias_name: z.string() })),
    TagController.removeAlias
);

tagRouter.post(
    "/api/tags/:name/implication",
    zValidator("param", z.object({ name: z.string() })),
    zValidator("form", z.object({ target_tag: z.string() })),
    TagController.addImplication
);

tagRouter.delete(
    "/api/tags/:name/implication/:target_id",
    zValidator("param", z.object({ name: z.string(), target_id: z.string().transform((v) => parseInt(v, 10)) })),
    TagController.removeImplication
);
