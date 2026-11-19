const mongoose = require("mongoose");

const HomeBrandSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, "Brand name is required"], 
      trim: true,
      minlength: [1, "Name must be at least 1 character"],
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    logo: { 
      type: String, 
      trim: true,
      default: "" // URL, base64 data, or relative path
    },
    icon: { 
      type: String, 
      trim: true,
      default: "" // Brand icon code (e.g. "google", "microsoft", "amazon")
    },
    category: { 
      type: String, 
      trim: true,
      default: "Global Tech & Marketplace" 
    },
    websiteUrl: { 
      type: String, 
      trim: true,
      default: "" 
    },
    order: { 
      type: Number, 
      default: 0,
      min: [0, "Order must be 0 or greater"]
    },
    isActive: { 
      type: Boolean, 
      default: true, 
      index: true 
    },
  },
  { timestamps: true }
);

HomeBrandSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model("HomeBrand", HomeBrandSchema);
