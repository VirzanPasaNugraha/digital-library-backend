import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload PDF → IMAGE (halaman pertama) + WATERMARK
 * - Orientasi DINORMALISASI (tidak terbalik)
 * - Aman di semua device (mobile / desktop)
 * - Siap production
 */
export function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image", // PDF → image (page 1)
        folder: options.folder || "documents",

        use_filename: true,
        unique_filename: true,
        overwrite: false,

        transformation: [
          // 1️⃣ HAPUS metadata & orientasi PDF
          { flags: "force_strip" },

          // 2️⃣ PAKSA orientasi normal
          { angle: 0 },

          // 3️⃣ BARU pasang watermark
          {
            overlay: { public_id: "watermark_dwxc4s" },
            gravity: "center",
            opacity: 25,
            width: 0.6,
            crop: "scale",
          },
        ],
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
}

/**
 * Hapus file dari Cloudinary
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;

  return cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
}

export { cloudinary };
