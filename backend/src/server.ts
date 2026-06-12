import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/auth.routes";

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
app.use("/api/auth", authRoutes);

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "EventPulse backend is running",
  });
});

app.listen(port, () => {
  console.log(`EventPulse backend running on port ${port}`);
});
