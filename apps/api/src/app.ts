import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { sessionMiddleware } from "./middleware/session.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { uploadPublicRoot } from "./middleware/upload.js";

import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { publicRouter } from "./modules/public/public.routes.js";
import { problemsRouter } from "./modules/problems/problems.routes.js";
import { proposalsRouter } from "./modules/proposals/proposals.routes.js";
import { minesRouter } from "./modules/mines/mines.routes.js";
import { wasteRouter } from "./modules/waste/waste.routes.js";
import { connectionsRouter } from "./modules/connections/connections.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

export const app = express();


app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    // WEB_ORIGIN="*" bo'lsa har qanday origin aks ettiriladi (development uchun ochiq),
    // aks holda vergul bilan ajratilgan aniq ro'yxat ishlatiladi.
    origin: env.corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
if (!env.isProduction) app.use(morgan("dev"));
app.use(sessionMiddleware);
app.use("/api", generalLimiter);

app.use("/uploads/public", express.static(uploadPublicRoot));

app.use("/api/health", healthRouter);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);
app.use("/api", problemsRouter);
app.use("/api", proposalsRouter);
app.use("/api", minesRouter);
app.use("/api", wasteRouter);
app.use("/api/connections", connectionsRouter);
app.use("/api/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);
