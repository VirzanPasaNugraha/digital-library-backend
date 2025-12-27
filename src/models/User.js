import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    nim: { type: String, default: "" },
    prodi: { type: String, enum: ["IF", "SI", ""], default: "" },

    // mengikuti FE kamu: mahasiswa | admin-if | admin-si
    role: { type: String, enum: ["mahasiswa", "admin-if", "admin-si"], default: "mahasiswa" },

    isActive: { type: Boolean, default: false },
    is_banned: { type: Boolean, default: false }
  },
  {
    timestamps: true, // createdAt/updatedAt :contentReference[oaicite:3]{index=3}
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

export default mongoose.model("User", userSchema);
