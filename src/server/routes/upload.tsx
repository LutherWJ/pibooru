import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { PostRatingSchema } from "../db/schema";
import { UploadController } from "../controllers/upload.controller";
import type { AppEnv } from "../types";

export const uploadRouter = new Hono<AppEnv>();

uploadRouter.get("/", UploadController.showUpload);

uploadRouter.post(
    "/",
    zValidator(
        "form",
        z.object({
            file: z.any().refine((file) => file instanceof File, "File is required"),
            rating: PostRatingSchema.default("s"),
            source: z.string().optional().nullable(),
            tags: z.string().optional().default(""),
        }),
        (result, c) => {
            if (!result.success) {
                if (c.req.header("accept")?.includes("application/json")) {
                    return c.json({ success: false, error: result.error.issues }, 400);
                }
            }
        }
    ),
    UploadController.handleUpload
);

export default uploadRouter;
