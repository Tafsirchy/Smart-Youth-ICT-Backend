const mongoose = require("mongoose");

const slugify = require("slugify");

const { isValidPoint } = require("../utils/geoPoint");

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
        // No default on purpose: a default would materialise `location: { type: 'Point' }`
        // on every document, and MongoDB's 2dsphere index rejects a Point without
        // coordinates. Write paths add `type` together with `coordinates`.
        default: undefined
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

// The 2dsphere index rejects any document whose `location` exists but is not a
// real GeoJSON Point ("Can't extract geo keys"). Normalise/validate here so a bad
// payload fails with a readable validation error (HTTP 400) instead of a 500.
BranchSchema.pre("validate", function (next) {
  const loc = this.location;

  if (loc && typeof loc === "object") {
    const coordinates = Array.isArray(loc.coordinates) ? loc.coordinates : [];

    if (coordinates.length === 0) {
      // No coordinates to index (e.g. the dashboard sends `lat: '', long: ''`
      // when no point was picked) → drop the placeholder object entirely.
      this.location = undefined;
    } else if (!isValidPoint(loc)) {
      this.invalidate(
        "location",
        "location must be a GeoJSON Point with a [longitude, latitude] pair"
      );
    }
  }

  next();
});

BranchSchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true }) || this.code.toLowerCase();
  }
  next();
});

module.exports = mongoose.model("Branch", BranchSchema);
