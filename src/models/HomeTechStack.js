const mongoose = require("mongoose");

const HomeTechStackSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, "Technology name is required"], 
      trim: true,
      minlength: [1, "Name must be at least 1 character"],
      maxlength: [60, "Name cannot exceed 60 characters"]
    },
    category: { 
      type: String, 
      required: [true, "Category is required"],
      enum: {
        values: ["language", "markup", "framework", "database", "devops_cloud"],
        message: "{VALUE} is not a valid category"
      },
      default: "language"
    },
    badge: { 
      type: String, 
      trim: true,
      default: "Language" 
    },
    icon: { 
      type: String, 
      trim: true,
      default: "" // Devicon class, Lucide icon, or custom SVG/image URL
    },
    color: { 
      type: String, 
      trim: true,
      default: "#10B981" // Brand HEX or CSS color
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

HomeTechStackSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model("HomeTechStack", HomeTechStackSchema);
