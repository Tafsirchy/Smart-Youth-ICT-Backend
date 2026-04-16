const mongoose = require("mongoose");

const WebServiceContentSchema = new mongoose.Schema(
  {
    pageType: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "portfolio-websites", 
        "business-websites", 
        "ecommerce", 
        "custom-apps", 
        "erp-crm",
        "branding",
        "ui-ux",
        "social-creatives",
        "facebook-ads",
        "seo",
        "chatbot",
        "automation",
        "hosting",
        "maintenance",
        "hire-student",
        "web-development",
        "mobile-app-development",
        "digital-marketing",
        "cloud-services",
        "cybersecurity",
        "data-analytics",
        "ai-solutions",
        "it-consulting"
      ]
    },
    // Landing (Main) Page Content
    landing: {
      hero: {
        badge: String,
        title: String,
        subtitle: String,
        description: String,
        mainImage: String,
      },
      sections: {
        philosophies: [{
          title: String,
          desc: String,
          icon: String, 
          color: String,
          shadow: String,
        }],
        phases: [{
          id: String,
          t: String,
          d: String,
        }],
        verticals: [{
          title: String,
          desc: String,
          icon: String,
          color: String,
          border: String,
        }],
        integrations: [mongoose.Schema.Types.Mixed], 
        pricing: [{
          t: String,
          p: String,
          list: [String],
          color: String,
          highlight: Boolean,
        }],
        metrics: [mongoose.Schema.Types.Mixed], // New for marketing pages
        pillars: [mongoose.Schema.Types.Mixed], // Added alias support
      },
      cta: {
        title: String,
      }
    },
    // Details Page Content
    details: {
      hero: {
        badge: String,
        title: String,
        subtitle: String,
        description: String,
        desc: String,
      },
      sections: {
        phases: [{
           t: String,
           d: String,
           icon: String,
           step: String,
           stage: String, // Supporting naming from branding details
           action: String, // Supporting naming from branding details
        }],
        techStack: [{
          t: String,
          d: String,
          icon: String,
          color: String,
          colSpan: String,
        }],
        checklist: [{
          t: String,
          d: String,
        }],
        manifest: [{
          label: String,
          value: String,
        }],
        codeSnippet: {
          title: String,
          description: String,
          tags: [String],
          code: String,
          fileName: String,
        },
        roi: [{
          title: String,
          desc: String,
          icon: String,
          features: [String],
          protocol: String,
          support: String,
          items: [String], // Added for branding etc
          group: String,   // Added for branding etc
        }]
      },
      cta: {
        title: String,
      }
    }
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("WebServiceContent", WebServiceContentSchema);
