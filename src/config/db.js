import mongoose from "mongoose";

export async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI belum di-set di .env");

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err?.message || err);
    process.exit(1);
  }
}
