import mongoose from "mongoose";

const { Schema } = mongoose;

// status dokumen (sesuai FE Anda)
export const STATUS = {
  PENDING: "PENDING",
  DITERIMA: "DITERIMA",
  DITOLAK: "DITOLAK",
};


const documentSchema = new Schema(
  {
    // metadata utama
    tipe: {
      type: String,
      enum: ["Skripsi", "Laporan KP"],
      required: true,
    },

    judul: {
      type: String,
      required: true,
      trim: true,
    },
    embedding: {
  type: [Number],
  default: [],
  index: false,
},


    penulis: {
      type: String,
      required: true,
      trim: true,
    },

    nim: {
      type: String,
      required: true,
      trim: true,
    },

    prodi: {
      type: String,
      enum: ["IF", "SI"],
      required: true,
    },

    fakultas: {
      type: String,
      default: "FTI",
    },

    tahun: {
      type: Number,
      required: true,
    },

    // bisa lebih dari satu pembimbing
    pembimbing: {
      type: [String],
      default: [],
    },

    keywords: {
      type: [String],
      default: [],
    },

    abstrak: {
      type: String,
      default: "",
    },

    // status verifikasi
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.PENDING,
    },

    alasanPenolakan: {
      type: String,
      default: "",
    },

    versi: {
      type: Number,
      default: 1,
    },

    // ===============================
    // FILE (CLOUDINARY)
    // ===============================
    file: {
      url: {
        type: String,
        required: true, // secure_url dari Cloudinary
      },
      publicId: {
        type: String,
        required: true, // untuk delete / replace
      },
      originalName: {
        type: String,
        default: "",
      },
      mime: {
        type: String,
        default: "application/pdf",
      },
      size: {
        type: Number,
        default: 0,
      },
    },

    // relasi user
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,

    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // normalisasi id
        ret.id = ret._id.toString();
        delete ret._id;

        // FE langsung pakai URL Cloudinary
        ret.pdfUrl = ret.file?.url || "";

        return ret;
      },
    },

    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;

        ret.pdfUrl = ret.file?.url || "";

        return ret;
      },
    },
  }
);

// index untuk search
documentSchema.index({
  judul: "text",
  penulis: "text",
  abstrak: "text",
  keywords: "text",
});

export default mongoose.model("Document", documentSchema);
