import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { router } from "../routes/index.js";
import { errorHandler } from "../middlewares/errorHandler.js";
import { notFound } from "../middlewares/notFound.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.use("/api", router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
