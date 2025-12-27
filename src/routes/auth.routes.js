import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import validateStudentDomain from "../middleware/validateStudentDomain.js";
import { sendMail } from "../utils/mailer.js";

const router = Router();

router.post("/register", validateStudentDomain, async (req, res, next) => {
  try {
    const { name, email, password, nim, prodi } = req.body;

    if (!name || !email || !password || !prodi) {
      return res.status(400).json({ message: "Field wajib belum lengkap" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email sudah terdaftar" });

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      nim: nim || "",
      prodi,
      role: "mahasiswa",
      isActive: false,
      is_banned: false,
    });

    return res.json({ message: "Akun dibuat. Tunggu aktivasi admin." });
  } catch (e) {
    next(e);
  }
});


router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase?.() });
    if (!user) return res.status(401).json({ message: "Email atau password salah" });

    const ok = await bcrypt.compare(password || "", user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Email atau password salah" });

    if (!user.isActive) return res.status(403).json({ message: "Akun belum diaktifkan admin" });
    if (user.is_banned) return res.status(403).json({ message: "Akun diblokir" });

    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role, prodi: user.prodi },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    return res.json({ token, user: user.toJSON() });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user.toJSON() });
});

router.get("/test-mail", async (req, res, next) => {
  try {
    await sendMail({
      to: process.env.MAIL_USER,
      subject: "Test SMTP",
      text: "Kalau ini masuk, SMTP kamu hidup.",
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
