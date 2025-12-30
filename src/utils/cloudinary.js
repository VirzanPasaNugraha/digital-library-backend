import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

/**
 * Cloudinary configuration
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload PDF → IMAGE (halaman 1) + WATERMARK
 * - Normalize orientation (anti kebalik)
 * - Konsisten di semua device
 */
export function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image", // PDF → IMAGE (page 1)
        folder: options.folder || "documents",

        use_filename: true,
        unique_filename: true,
        overwrite: false,

        /**
         * TRANSFORMATION PIPELINE
         */
        transformation: [
          /**
           * STEP 1:
           * Normalize orientation PDF
           * - Mengabaikan rotation metadata PDF
           * - Menyamakan orientasi di semua device
           */
          {
            angle: 0,
            width: 1200,
            height: 1600,
            crop: "fit",
            background: "white",
          },

          /**
           * STEP 2:
           * Apply watermark
           */
          {
            overlay: {
              public_id: "watermark_dwxc4s", // pastikan IMAGE watermark
            },
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

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Delete image from Cloudinary
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;

  return cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
}

export { cloudinary };
