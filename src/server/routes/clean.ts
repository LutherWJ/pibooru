import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { CleanController } from "../controllers/clean.controller";
import type { AppEnv } from "../types";

export const cleanRouter = new Hono<AppEnv>();

cleanRouter.get(
  "/clean",
  zValidator(
    "query",
    z.object({
      tags: z.string().optional().default(""),
      page: z.string().optional().default("1"),
    })
  ),
  CleanController.showClean
);

cleanRouter.delete(
  "/clean/post/:id",
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
      page: z.string().optional().default("1"),
    })
  ),
  CleanController.deletePost
);

cleanRouter.post(
  "/clean/post/:id/delete",
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
      page: z.string().optional().default("1"),
    })
  ),
  CleanController.deletePost
);
