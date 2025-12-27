import bcrypt from "bcrypt";
import User from "../models/User.js";

export async function seedAdmins() {
  const seeds = [
    {
      email: process.env.SEED_ADMIN_IF_EMAIL,
      password: process.env.SEED_ADMIN_IF_PASSWORD,
      role: "admin-if",
      prodi: "IF",
      name: "Admin IF",
    },
    {
      email: process.env.SEED_ADMIN_SI_EMAIL,
      password: process.env.SEED_ADMIN_SI_PASSWORD,
      role: "admin-si",
      prodi: "SI",
      name: "Admin SI",
    },
  ].filter(s => s.email && s.password);

  for (const s of seeds) {
    const exists = await User.findOne({ email: s.email.toLowerCase() });
    if (exists) continue;

    const passwordHash = await bcrypt.hash(s.password, 10);
    await User.create({
      name: s.name,
      email: s.email,
      passwordHash,
      role: s.role,
      prodi: s.prodi,
      isActive: true,
      is_banned: false,
    });

    console.log(`✅ Seeded ${s.role}: ${s.email}`);
  }
}