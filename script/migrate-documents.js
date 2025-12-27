import mongoose from "mongoose";
import dotenv from "dotenv";
import Document from "../models/Document.js";

dotenv.config();

function cleanStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
}

function splitCommaString(s) {
  return String(s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toStringAbstrak(v) {
  if (Array.isArray(v)) {
    return v.map((x) => String(x ?? "").trim()).filter(Boolean).join("\n").trim();
  }
  if (v == null) return "";
  return String(v).trim();
}

async function run() {
  const DRY_RUN = process.argv.includes("--dry-run");

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI tidak ditemukan di .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  // cari dokumen yang berpotensi format lama
  const candidates = await Document.find({
    $or: [
      { pembimbing: { $type: "string" } },
      { abstrak: { $type: "array" } },
      // bonus: bersihin array yang sudah ada tapi masih kotor
      { pembimbing: { $type: "array" } },
      { keywords: { $type: "array" } },
    ],
  }).select("_id pembimbing abstrak keywords");

  console.log(`📦 Candidates ditemukan: ${candidates.length}`);

  let changed = 0;
  const ops = [];

  for (const d of candidates) {
    const update = {};
    let dirty = false;

    // pembimbing: string -> array, array -> cleaned
    if (typeof d.pembimbing === "string") {
      update.pembimbing = splitCommaString(d.pembimbing);
      dirty = true;
    } else if (Array.isArray(d.pembimbing)) {
      const cleaned = cleanStringArray(d.pembimbing);
      // update hanya kalau beda
      if (JSON.stringify(cleaned) !== JSON.stringify(d.pembimbing)) {
        update.pembimbing = cleaned;
        dirty = true;
      }
    } else if (d.pembimbing == null) {
      update.pembimbing = [];
      dirty = true;
    }

    // abstrak: array -> string, string -> trimmed
    if (Array.isArray(d.abstrak)) {
      update.abstrak = toStringAbstrak(d.abstrak);
      dirty = true;
    } else if (typeof d.abstrak === "string") {
      const trimmed = d.abstrak.trim();
      if (trimmed !== d.abstrak) {
        update.abstrak = trimmed;
        dirty = true;
      }
    } else if (d.abstrak == null) {
      update.abstrak = "";
      dirty = true;
    } else {
      // kalau tipe aneh (number/object), paksa jadi string
      update.abstrak = toStringAbstrak(d.abstrak);
      dirty = true;
    }

    // keywords: pastikan clean (opsional tapi membantu)
    if (Array.isArray(d.keywords)) {
      const cleanedKw = cleanStringArray(d.keywords);
      if (JSON.stringify(cleanedKw) !== JSON.stringify(d.keywords)) {
        update.keywords = cleanedKw;
        dirty = true;
      }
    }

    if (dirty) {
      changed++;
      ops.push({
        updateOne: {
          filter: { _id: d._id },
          update: { $set: update },
        },
      });
    }
  }

  console.log(`🧹 Dokumen yang akan diubah: ${changed}`);

  if (DRY_RUN) {
    console.log("🟡 DRY RUN: tidak ada perubahan yang ditulis ke database.");
    await mongoose.disconnect();
    return;
  }

  if (ops.length > 0) {
    const result = await Document.bulkWrite(ops, { ordered: false });
    console.log("✅ Bulk write done:", {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } else {
    console.log("✅ Tidak ada yang perlu diubah.");
  }

  await mongoose.disconnect();
  console.log("✅ Done.");
}

run().catch((e) => {
  console.error("❌ Migration error:", e);
  process.exit(1);
});
