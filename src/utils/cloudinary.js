import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: options.folder || "documents",

        use_filename: true,
        unique_filename: true,
        overwrite: false,

        transformation: [
          // STEP 1: normalize PDF orientation
          {
            angle: 0,
            width: 1200,
            height: 1600,
            crop: "fit",
            background: "white",
          },

          // STEP 2: watermark (RELATIVE + layer_apply)
          {
            overlay: { public_id: "watermark_dwxc4s" },
            gravity: "center",
            opacity: 25,
            width: 0.6,
            crop: "scale",
            relative: true,
            flags: "layer_apply",
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

export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;

  return cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
}

export { cloudinary };
