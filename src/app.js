import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/users.routes.js";
import documentRoutes from "./routes/documents.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: [
      "https://digital-library-frontend-zeta.vercel.app"
    ],
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (_, res) => {
  res.json({ message: "Library Backend API is running" });
});


app.get("/api/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
