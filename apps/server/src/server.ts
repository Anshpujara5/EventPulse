import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import apiKeyRoutes from "./routes/apiKey.routes";
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import projectRoutes from "./routes/project.routes";

dotenv.config();

const app = express();
const port = process.env.PORT ?? 5001;
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

app.use(express.json());
app.use(
  cors({
    origin: frontendUrl,
  }),
);
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/api-keys", apiKeyRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "EventPulse backend is running",
  });
});

app.listen(port, () => {
  console.log(`EventPulse backend running on port ${port}`);
});
