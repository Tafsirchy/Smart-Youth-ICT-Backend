const mongoose = require("mongoose");

const CompanyCertificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Certification title is required"],
      trim: true,
    },
    issuer: {
      type: String,
      required: [true, "Issuing authority is required"],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "Accreditation",
    },
    credentialId: {
      type: String,
      trim: true,
      default: "",
    },
    issueDate: {
      type: String,
      trim: true,
      default: "",
    },
    expiryDate: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      required: [true, "Certificate image is required"],
      trim: true,
    },
    verificationUrl: {
      type: String,
      trim: true,
      default: "",
    },
    highlights: [
      {
        type: String,
        trim: true,
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CompanyCertification",
  CompanyCertificationSchema
);
