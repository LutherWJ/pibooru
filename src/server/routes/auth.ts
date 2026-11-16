import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { rateLimiter } from "hono-rate-limiter";
import { AuthController } from "../controllers/auth.controller";
import { CONFIG } from "../util/config";
import type { AppEnv } from "../types";

export const authRouter = new Hono<AppEnv>();

const loginLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: CONFIG.isTest ? 10000 : 5,
    message: "Too many login attempts, please try again later",
    standardHeaders: "draft-6",
    keyGenerator: (c) => c.req.header("x-forwarded-for") || "anonymous",
});

authRouter.get("/login", AuthController.showLogin);

authRouter.post(
    "/login",
    loginLimiter,
    zValidator(
        "form",
        z.object({
            username: z.string().min(1),
            password: z.string().min(1),
        })
    ),
    AuthController.login
);

authRouter.get("/logout", AuthController.logout);
