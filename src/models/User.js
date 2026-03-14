const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phone: { type: String, trim: true, default: "" },
    password: {
      type: String,
      minlength: 8,
      select: false,
      required() {
        return this.providers?.includes("credentials");
      },
    },
    providers: {
      type: [{ type: String, enum: ["credentials", "google"] }],
      default: ["credentials"],
    },
    googleId: { type: String, unique: true, sparse: true, index: true },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },
    language: { type: String, enum: ["bn", "en"], default: "bn" },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "", trim: true, maxlength: 500 },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: Date,
    tokenVersion: { type: Number, default: 0 },

    // Affiliate
    affiliateCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Password reset
    resetToken: String,
    resetExpiry: Date,
  },
  { timestamps: true },
);

// Hash password before save
UserSchema.pre("save", async function () {
  this.providers = [...new Set((this.providers || []).filter(Boolean))];

  if (!this.isModified("password")) return;
  if (!this.password) return;

  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

// Compare password method
UserSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.hasProvider = function (provider) {
  return this.providers?.includes(provider);
};

UserSchema.methods.addProvider = function (provider) {
  if (!this.providers?.includes(provider)) {
    this.providers = [...(this.providers || []), provider];
  }
};

module.exports = mongoose.model("User", UserSchema);
