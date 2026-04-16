const mongoose = require("mongoose");

const HeroContentSchema = new mongoose.Schema({
  badge: String,
  title: String,
  subtitle: String,
  description: String,
}, { _id: false });

const MethodologyItemSchema = new mongoose.Schema({
  title: String,
  description: String,
}, { _id: true });

const CTAContentSchema = new mongoose.Schema({
  title: String,
  description: String,
  buttonText: String,
}, { _id: false });

const ServicePageContentSchema = new mongoose.Schema(
  {
    pageType: { 
      type: String, 
      required: true, 
      unique: true,
      enum: ["skill-development", "career-tracks", "certifications", "freelancing", "job-placement"]
    },
    hero: HeroContentSchema,
    methodology: [MethodologyItemSchema],
    details: {
      hero: HeroContentSchema,
      sections: mongoose.Schema.Types.Mixed,
      cta: CTAContentSchema
    },
    cta: CTAContentSchema
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("ServicePageContent", ServicePageContentSchema);
