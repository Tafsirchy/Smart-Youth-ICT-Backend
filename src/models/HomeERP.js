const mongoose = require("mongoose");

const HomeERPSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: [true, "ERP software title is required"], 
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"]
    },
    category: { 
      type: String, 
      trim: true,
      default: "Enterprise Software"
    },
    description: { 
      type: String, 
      trim: true,
      maxlength: [250, "Description cannot exceed 250 characters"],
      default: ""
    },
    icon: { 
      type: String, 
      trim: true,
      default: "Layers" // Lucide icon name or emoji
    },
    tag: { 
      type: String, 
      trim: true,
      default: "Ready to Deploy" 
    },
    badgeColor: {
      type: String,
      trim: true,
      default: "emerald" // emerald, blue, indigo, rose, amber, violet, cyan
    },
    demoUrl: { 
      type: String, 
      trim: true,
      default: "/contact?service=erp" 
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

HomeERPSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model("HomeERP", HomeERPSchema);
