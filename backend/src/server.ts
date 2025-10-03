import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./env";
import { ordersRouter } from "./routes/orders";
import { healthRouter } from "./routes/health";
import { ensureUploadsRoot, uploadsRoot } from "./services/storage";

export function createServer() {
  const app = express();

  ensureUploadsRoot();

  const corsOrigin = env.APP_BASE_URL;

  app.use(
    cors({
      origin: corsOrigin,
      methods: ["GET", "POST", "OPTIONS"],
      credentials: false,
    })
  );
  app.use(helmet());
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  app.use("/api/orders", limiter);

  app.use("/uploads", express.static(uploadsRoot, { fallthrough: false }));

  app.use("/api/orders", ordersRouter);
  app.use("/api/health", healthRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ code: "SERVER_ERROR", message: "Unexpected error" });
  });

  return app;
}
