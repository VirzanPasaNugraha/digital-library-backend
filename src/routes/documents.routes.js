import { Router } from "express";
import multer from "multer";
import Document, { STATUS } from "../models/Document.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { sendMail } from "../utils/mailer.js";
import { embedText } from "../utils/embedder.js";

const router = Router();

/* ===================== MULTER (MEMORY ONLY) ===================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (_, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Hanya file PDF yang diperbolehkan"));
    }
    cb(null, true);
  },
});

/* ===================== HELPERS ===================== */
function clampInt(v, def, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

function parseStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map(s => s.trim()).filter(Boolean);

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map(s => s.trim()).filter(Boolean);
  } catch {}

  return String(value)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function isAdminUser(user) {
  return !!user && ["admin-if", "admin-si"].includes(user.role);
}

async function listDocuments({ filter, q, page, limit }) {
  const skip = (page - 1) * limit;
  if (q) filter.$text = { $search: q };

  const [docs, total] = await Promise.all([
    Document.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Document.countDocuments(filter),
  ]);

  return {
    docs,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/* ===================== MY DOCS ===================== */
router.get("/_me/list", requireAuth, async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10_000);
    const limit = clampInt(req.query.limit, 12, 1, 50);
    const q = (req.query.q || "").trim();

    const filter = { owner: req.user._id };

    const { docs, total, totalPages } = await listDocuments({
      filter,
      q,
      page,
      limit,
    });

    res.json({ documents: docs, page, limit, total, totalPages });
  } catch {
    res.status(500).json({ message: "Gagal memuat dokumen saya." });
  }
});
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

router.get("/search", optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ documents: [] });

    // 1️⃣ embedding query
    const queryEmbedding = await embedText(q);

    // 2️⃣ ambil dokumen diterima
    const docs = await Document.find({
      status: STATUS.DITERIMA,
      embedding: { $exists: true, $ne: [] },
    });

    // 3️⃣ hitung similarity
    const scored = docs.map((doc) => {
      const minLen = Math.min(
        doc.embedding.length,
        queryEmbedding.length
      );

      const score = cosineSimilarity(
        doc.embedding.slice(0, minLen),
        queryEmbedding.slice(0, minLen)
      );

      return { ...doc.toObject(), score };
    });

    // 4️⃣ filter & sort
    const results = scored
      .filter(d => d.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ documents: results });
  } catch (err) {
    res.status(500).json({ message: "Gagal semantic search" });
  }
});

/* ===================== ADMIN UPDATE METADATA ===================== */
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin-if", "admin-si"),
  async (req, res) => {
    try {
      const {
        judul,
        penulis,
        nim,
        prodi,
        tipe,
        tahun,
        pembimbing,
        keywords,
        abstrak,
      } = req.body;

      const doc = await Document.findById(req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan" });
      }

      // update field metadata
      doc.judul = judul;
      doc.penulis = penulis;
      doc.nim = nim;
      doc.prodi = prodi;
      doc.tipe = tipe;
      doc.tahun = Number(tahun);
      doc.pembimbing = parseStringArray(pembimbing);
doc.keywords = parseStringArray(keywords);

     doc.abstrak = abstrak || "";

// ===== RE-EMBED JIKA SUDAH DITERIMA =====
if (doc.status === STATUS.DITERIMA) {
  const textForEmbedding = `
${doc.judul}
${doc.abstrak}
${doc.keywords.join(" ")}
`;
  doc.embedding = await embedText(textForEmbedding);
}
// ======================================

await doc.save();


      res.json({
        document: doc,
        message: "Metadata dokumen berhasil diperbarui",
      });
    } catch (err) {
      res.status(500).json({ message: "Gagal memperbarui metadata dokumen" });
    }
  }
);


/* ===================== ADMIN LIST ===================== */
router.get(
  "/_admin/list",
  requireAuth,
  requireRole("admin-if", "admin-si"),
  async (req, res) => {
    try {
      const { status, prodi } = req.query;
      const page = clampInt(req.query.page, 1, 1, 10_000);
      const limit = clampInt(req.query.limit, 12, 1, 50);
      const q = (req.query.q || "").trim();

      const filter = {};
      if (status) filter.status = status;
      if (prodi) filter.prodi = prodi;

      const { docs, total, totalPages } = await listDocuments({
        filter,
        q,
        page,
        limit,
      });

      res.json({ documents: docs, page, limit, total, totalPages });
    } catch {
      res.status(500).json({ message: "Gagal memuat list admin." });
    }
  }
);

/* ===================== ADMIN UPDATE STATUS ===================== */
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("admin-if", "admin-si"),
  async (req, res) => {
    try {
      const { status, alasanPenolakan } = req.body;

      if (![STATUS.DITERIMA, STATUS.DITOLAK].includes(status)) {
        return res.status(400).json({ message: "Status tidak valid" });
      }

      if (status === STATUS.DITOLAK && !String(alasanPenolakan || "").trim()) {
        return res.status(400).json({ message: "Alasan penolakan wajib diisi" });
      }

      const doc = await Document.findById(req.params.id).populate("owner");
      if (!doc) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan" });
      }

      doc.status = status;
doc.alasanPenolakan =
  status === STATUS.DITOLAK ? String(alasanPenolakan).trim() : "";

// ================= EMBEDDING =================
if (status === STATUS.DITERIMA && doc.embedding.length === 0) {
  const textForEmbedding = `
${doc.judul}
${doc.abstrak}
${doc.keywords.join(" ")}
`;

  doc.embedding = await embedText(textForEmbedding);
}
// =============================================

await doc.save();


      return res.json({
        document: doc,
        message: "Status dokumen berhasil diperbarui",
      });
    } catch (err) {
      return res.status(500).json({ message: "Gagal memperbarui status dokumen" });
    }
  }
);

/* ===================== LIST ===================== */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { q, prodi, tipe, tahun, status } = req.query;
    const page = clampInt(req.query.page, 1, 1, 10_000);
    const limit = clampInt(req.query.limit, 12, 1, 50);

    const filter = {};
    const isAdmin = isAdminUser(req.user);

    filter.status = isAdmin && status ? status : STATUS.DITERIMA;
    if (prodi) filter.prodi = prodi;
    if (tipe) filter.tipe = tipe;
    if (tahun) filter.tahun = Number(tahun);

    const { docs, total, totalPages } = await listDocuments({
      filter,
      q: q?.trim(),
      page,
      limit,
    });

    res.json({ documents: docs, page, limit, total, totalPages });
  } catch {
    res.status(500).json({ message: "Gagal memuat dokumen." });
  }
});

/* ===================== UPLOAD (MAHASISWA) ===================== */
router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "File PDF wajib" });

    const {
      judul,
      penulis,
      nim,
      prodi,
      tipe,
      tahun,
      pembimbing,
      abstrak,
      keywords,
    } = req.body;

    if (!judul || !penulis || !nim || !prodi || !tipe || !tahun) {
      return res.status(400).json({ message: "Field wajib belum lengkap" });
    }

    // ⬆️ UPLOAD KE CLOUDINARY
 const uploadResult = await uploadToCloudinary(req.file.buffer, {
  folder: "documents",
});



    const doc = await Document.create({
      judul,
      penulis,
      nim,
      prodi,
      tipe,
      tahun: Number(tahun),
      pembimbing: parseStringArray(pembimbing),
      keywords: parseStringArray(keywords),
      abstrak: abstrak || "",
      status: STATUS.PENDING,
      file: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        originalName: req.file.originalname,
        mime: req.file.mimetype,
        size: req.file.size,
      },
      owner: req.user._id,
      fakultas: "FTI",
    });

    res.json({
      document: doc,
      message: "Upload berhasil. Menunggu review admin.",
    });
  } catch (err) {
    res.status(500).json({ message: "Gagal upload dokumen." });
  }
});

/* ===================== DETAIL ===================== */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate("owner");
    if (!doc) return res.status(404).json({ message: "Dokumen tidak ditemukan" });

    const user = req.user;
    const isOwner = user && doc.owner?._id?.toString() === user._id.toString();
    const isAdmin = isAdminUser(user);

    if (doc.status !== STATUS.DITERIMA && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Tidak punya akses" });
    }

    res.json({ document: doc });
  } catch {
    res.status(400).json({ message: "ID tidak valid" });
  }
});

/* ===================== DELETE (ADMIN) ===================== */
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin-if", "admin-si"),
  async (req, res) => {
    try {
      const doc = await Document.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: "Dokumen tidak ditemukan" });

      // hapus dari Cloudinary
      await deleteFromCloudinary(doc.file.publicId);

      await doc.deleteOne();
      res.json({ message: "Dokumen dihapus" });
    } catch {
      res.status(500).json({ message: "Gagal menghapus dokumen." });
    }
  }
);

export default router;
