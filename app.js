import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/users.routes.js";
import documentRoutes from "./src/routes/documents.routes.js";
import { notFound, errorHandler } from "./src/middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: [
      "https://digital-library-frontend-zeta.vercel.app",
      /\.vercel\.app$/ // optional — izinkan semua preview domain Vercel juga
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());


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