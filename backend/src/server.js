import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db/pool.js";
import authRoutes from "./routes/auth.js";
import examRoutes from "./routes/exams.js";
import attemptRoutes from "./routes/attempts.js";
import codingRoutes from "./routes/coding.js";
import teacherRoutes from "./routes/teacher.js";
import studentRoutes from "./routes/student.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
  })
);
app.use(express.json({ limit: "200kb" })); // source code is sent in the request body

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS time");
    res.json({ status: "ok", db: "connected", time: result.rows[0].time });
  } catch (err) {
    res.status(500).json({ status: "error", db: "not connected", message: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/coding", codingRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, (err) => {
  if (err) {
    console.error("Server failed to start:", err.message);
    process.exit(1);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});