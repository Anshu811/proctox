import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, teacherCode } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let finalRole = "student";
    if (role === "teacher") {
      if (!process.env.TEACHER_SIGNUP_CODE || teacherCode !== process.env.TEACHER_SIGNUP_CODE) {
        return res.status(403).json({ message: "Invalid teacher code" });
      }
      finalRole = "teacher";
    }

    const emailNorm = email.trim().toLowerCase();
    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [emailNorm]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ message: "This email is already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
      [name.trim(), emailNorm, hash, finalRole]
    );

    const user = result.rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email.trim().toLowerCase(),
    ]);
    const row = result.rows[0];

    // same message for wrong email or wrong password (do not reveal which)
    const ok = row && (await bcrypt.compare(password, row.password_hash));
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });

    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/me  (token se current user)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "User not found" });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;