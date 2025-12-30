import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload PDF → IMAGE (halaman pertama) + WATERMARK
 * - Tidak kebalik
 * - Watermark PASTI muncul
 * - Stabil di semua device
 */
export function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: options.folder || "documents",

        use_filename: true,
        unique_filename: true,
        overwrite: false,

        transformation: [
          // 1️⃣ Normalisasi orientasi
          { flags: "force_strip" },
          { angle: 0 },

          // 2️⃣ Pasang watermark (LAYER)
          {
            overlay: "watermark_dwxc4s",
            width: 0.6,
            crop: "scale",
            gravity: "center",
            effect: "opacity:25",
          },

          // 3️⃣ APPLY overlay (WAJIB)
          { flags: "layer_apply" },
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
