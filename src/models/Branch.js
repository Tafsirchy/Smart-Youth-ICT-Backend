const mongoose = require("mongoose");

const slugify = require("slugify");

const BranchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['head_office', 'regional', 'local'], default: 'local' },
    division: { 
      type: String, 
      trim: true, 
      enum: ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh', 'Other'],
      default: 'Dhaka' 
    },
    establishedDate: { type: Date },
    logo: { type: String, trim: true },
    coverImage: { type: String, trim: true },
    gallery: [{ type: String, trim: true }],
    facilities: [{ type: String, trim: true }],
    website: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      area: { type: String, trim: true },
      city: { type: String, trim: true },
      country: { type: String, trim: true, default: "Bangladesh" },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false
      },
      googleMapsUrl: { type: String, trim: true }
    },
    contact: {
      email: { type: String, trim: true, lowercase: true },
      phones: [{ type: String, trim: true }], // Support multiple numbers
    },
    whatsapp: { type: String, trim: true },
    notice: {
      title: { type: String, trim: true },
      text: { type: String, trim: true },
      isActive: { type: Boolean, default: false }
    },
    officeHours: [
      {
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false }
      }
    ],
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    isActive: { type: Boolean, default: true },
    settings: {
      allowCustomFees: { type: Boolean, default: false },
      maxStudents: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

BranchSchema.index({ location: "2dsphere" });

BranchSchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true }) || this.code.toLowerCase();
  }
  next();
});

module.exports = mongoose.model("Branch", BranchSchema);
