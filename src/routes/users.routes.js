import { Router } from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

// admin only
router.use(requireAuth, requireRole("admin-if", "admin-si"));

router.get("/", async (req, res) => {
  const { prodi, status } = req.query;

  const filter = { role: "mahasiswa" };
  if (prodi) filter.prodi = prodi;

  // status: aktif | belumaktif | banned
  if (status === "aktif") filter.isActive = true, filter.is_banned = false;
  if (status === "belumaktif") filter.isActive = false;
  if (status === "banned") filter.is_banned = true;

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ users: users.map(u => u.toJSON()) });
});

router.patch("/:id/activate", async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
  res.json({ user: user.toJSON() });
});

router.patch("/:id/ban", async (req, res) => {
  const { is_banned } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { is_banned: !!is_banned }, { new: true });
  if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
  res.json({ user: user.toJSON() });
});

router.delete("/:id", async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
  res.json({ message: "User dihapus" });
});

export default router;
