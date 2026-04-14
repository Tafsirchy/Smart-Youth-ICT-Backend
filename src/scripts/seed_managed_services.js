const mongoose = require("mongoose");
const WebServiceContent = require("../models/WebServiceContent");
require("dotenv").config();

const managedServices = [
  {
    pageType: "chatbot",
    landing: {
      hero: {
        badge: "✨ Next-Gen AI Support [NEW]",
        title: "Neural Response",
        description: "Architecting conversation with precision. We build RAG-powered, multi-channel AI agents that reduce operational friction and drive autonomous engagement.",
      },
      sections: {
        pillars: [
          { title: "Neural Architectures", desc: "Utilizing Large Language Models (LLMs) to understand context, intent, and sentiment for human-level reasoning.", icon: "Chip", color: "from-emerald-500 to-teal-600" },
          { title: "Deterministic Logic", desc: "Structured workflow systems designed for high-velocity FAQ handling and precise data collection.", icon: "GitNetwork", color: "from-blue-500 to-indigo-600" },
          { title: "Hybrid Governance", desc: "Combining AI autonomy with seamless human-agent handoffs for enterprise-grade support reliability.", icon: "Analytics", color: "from-purple-500 to-fuchsia-600" }
        ],
        integrations: [
          { t: "WhatsApp Business", d: "High-latency direct chat" },
          { t: "Facebook Messenger", d: "Social commerce sync" },
          { t: "Native Web Chat", d: "Browser-level engagement" },
          { t: "GDPR Compliant", d: "ISO-27001 Security standards" }
        ]
      },
      cta: { title: "Build My AI Agent" }
    },
    details: {
      hero: {
        badge: "Inference Manifest",
        title: "Intelligence Architecture",
        desc: "We don't just build scripts; we architect autonomous intelligence layers that process intent with surgical precision.",
        subtitle: "AI_CORE_SPEC_v6.4"
      },
      sections: {
        phases: [
          { step: "01", stage: "Data Ingestion", action: "Parsing unstructured business data (PDFs, Docs, CRM) into high-dimensional vector embeddings." },
          { step: "02", stage: "RAG Architecture", action: "Implementing Retrieval-Augmented Generation to ensure AI answers are grounded in your specific data." },
          { step: "03", stage: "Inference Tuning", action: "Optimizing model temperature, top-p, and system prompts for accurate intent recognition." },
          { step: "04", stage: "API Orchestration", action: "Connecting the AI core to your backend systems via secure REST/GraphQL hooks." },
          { step: "05", stage: "Shadow Testing", action: "Running the bot in 'listen-only' mode to benchmark accuracy against human agents." },
          { step: "06", stage: "Active Deployment", action: "Phased rollout with daily logic pruning and feedback loop integration." }
        ],
        roi: [
          { group: "Intelligence Tier", items: ["GPT-4o / Claude 3.5 Sync", "Custom Vector DB", "NLP Sentiment Mapping", "Zero-Shot Learning"] },
          { group: "Integrity Tier", items: ["AES-256 Encryption", "SOC-2 Ready Hub", "PII Redaction Engine", "Rate Limiting V2"] },
          { group: "Interconnect Tier", items: ["WhatsApp Webhook API", "Websocket Live-stream", "CRM Bi-directional Sync", "JSON Meta-Payloads"] }
        ]
      },
      cta: { title: "Build My AI Agent" }
    }
  },
  {
    pageType: "automation",
    landing: {
      hero: {
        badge: "✨ Business Autopilot [NEW]",
        title: "Workflow Sovereignty",
        description: "Stop wasting human potential on repetitive tasks. We build complex Zapier, Make.com, and custom API logic to turn your fragmented apps into a unified, high-velocity growth engine.",
      },
      sections: {
        pillars: [
          { title: "Ecosystem Sync", desc: "Keep your CRM, Database, and E-commerce platforms in perfect harmony. No more manual entry or data fragmentation.", icon: "Sync", color: "from-amber-500 to-orange-600" },
          { title: "Financial Pipelines", desc: "Automated invoicing, payment tracking, and ledger updates triggered by project milestones or sales events.", icon: "Calculator", color: "from-indigo-600 to-blue-700" },
          { title: "Engagement Engines", desc: "Automated distribution of marketing assets and social content triggered by user behavior and trend signals.", icon: "ShareSocial", color: "from-slate-700 to-slate-900" }
        ],
        integrations: [
          { t: "Zapier Master", d: "100+ App integrations" },
          { t: "Make.com Lab", d: "High-complexity logic" },
          { t: "Custom Webhooks", d: "Direct server-to-server" },
          { t: "Zero-Latency Scan", d: "Instant data propagation" }
        ]
      },
      cta: { title: "Initialize Automation Audit" }
    },
    details: {
      hero: {
        badge: "Efficiency Manifest",
        title: "Logic Blueprints",
        desc: "Automation is not a task; it's a structural optimization of human time and organizational intelligence.",
        subtitle: "AUTO_BLUEPRINT_v6.8"
      },
      sections: {
        phases: [
          { step: "01", stage: "System Audit", action: "Mapping all manual touchpoints and identifying high-friction data silos within your current stack." },
          { step: "02", stage: "Node Architecture", action: "Designing the logic flows between software endpoints (e.g., Shopify to Quickbooks)." },
          { step: "03", stage: "Data Normalization", action: "Engineering the transformation logic to ensure data remains consistent across all platforms." },
          { step: "04", stage: "BETA Implementation", action: "Deploying automated workflows in a sandbox environment to monitor for latency or edge-case failure." },
          { step: "05", stage: "ROI Calibration", action: "Measuring 'Hours Saved' and 'Error Reduction' metrics to fine-tune the automation velocity." },
          { step: "06", stage: "Scale & Maintain", action: "Expanding automation to secondary departments and establishing monthly logic audits." }
        ],
        roi: [
          { group: "Integration Tier", items: ["Zapier / Make Orchestration", "Custom Webhook Hubs", "GraphQL / REST Logic", "JSON Transformation"] },
          { group: "Governance Tier", items: ["Error Handling Protocol", "OAuth 2.0 Security", "Rate Limit Guard", "Logging & Persistence"] },
          { group: "Performance Tier", items: ["Zero-Latency Webhooks", "Bulk Data Streamlining", "Conditional Logic Gates", "Real-time Sync Pulse"] }
        ]
      },
      cta: { title: "Initialize Automation Audit" }
    }
  },
  {
    pageType: "hosting",
    landing: {
      hero: {
        badge: "✨ Digital Infrastructure Sovereignty",
        title: "Uptime Sovereign",
        description: "More than just hosting. We provide high-vibration infrastructure that ensures your digital presence is resilient, secure, and globally optimized.",
      },
      sections: {
        pricing: [
          { t: "Edge Starter", p: "5.99", list: ["1 Domain", "10GB NVMe SSD", "Unmetered Data Flow", "Free SSL Gateway", "Tier-3 Support"], highlight: false },
          { t: "Enterprise Pro", p: "14.99", list: ["Unlimited Domains", "100GB NVMe SSD", "LSCache Protocol", "Daily Backups", "Priority 24/7 Access"], highlight: true },
          { t: "Managed VPS", p: "49.99", list: ["Fully Managed Nodes", "500GB NVMe SSD", "4 Core / 8GB RAM", "Dedicated IP", "Root Shell Access"], highlight: false }
        ],
        pillars: [
          { title: "NVMe Storage Gen4", desc: "Up to 50x faster read/write velocity than standard cloud storage.", icon: "Flash" },
          { title: "Infrastructure Security", desc: "Every node is guarded by advanced DDoS mitigation and AES-256.", icon: "Shield" },
          { title: "Elite Engineering", desc: "Real infrastructure engineers, not bots, available 24/7 for zero-latency support.", icon: "Headset" }
        ]
      },
      cta: { title: "Initialize Hosting Plan" }
    },
    details: {
      hero: {
        badge: "Infrastructure Manifest",
        title: "Infrastructure Manifest",
        desc: "Your digital foundation should be invisible yet invincible. We treat infrastructure as a zero-trust, high-vibration engineering discipline.",
        subtitle: "CLOUD_SPEC_v9.2"
      },
      sections: {
        phases: [
          { step: "01", stage: "Provisioning", action: "Deploying high-performance NVMe Gen4 nodes in strategic global data centers." },
          { step: "02", stage: "Network Hardening", action: "Implementing multi-layered DDoS mitigation and AES-256 encrypted backplanes." },
          { step: "03", stage: "SSL Handshake", action: "Automatic certificate generation and enforced TLS 1.3 security protocols." },
          { step: "04", stage: "CDN Propagation", action: "Caching static assets across 200+ edge locations for sub-50ms global latency." },
          { step: "05", stage: "Daily Snapshot", action: "Delta-based automated backups with 30-day high-availability retention." },
          { step: "06", stage: "Resource Scaling", action: "Dynamic CPU/RAM allocation based on traffic vibration and load signals." }
        ],
        roi: [
          { group: "Hardware Tier", items: ["NVMe Gen4 Storage", "ECC DDR4 RAM", "AMD EPYC Processors", "10Gbps Uplinks"] },
          { group: "Security Tier", items: ["Hardware Firewalls", "ModSecurity WAF", "Imunify360 Shield", "Isolated Cage Hubs"] },
          { group: "Authority Tier", items: ["Anycast DNS Hub", "Cloudflare Integration", "Free SSL Gateway", "Tier-3 Data Centers"] }
        ]
      },
      cta: { title: "Initialize Hosting Plan" }
    }
  },
  {
    pageType: "maintenance",
    landing: {
      hero: {
        badge: "Zero-Downtime Infrastructure Guarantee",
        title: "System Guard",
        description: "Never worry about crashes or security vulnerabilities again. We architect high-vibration maintenance protocols that ensure your platform remains elite, secure, and globally performant.",
      },
      sections: {
        pillars: [
          { title: "Security & Core", desc: "The structural essentials. Weekly off-site backups, core engine updates, and 24/7 malware monitoring to keep your node live.", icon: "Shield", color: "from-teal-600 to-emerald-700" },
          { title: "Standard Ops", desc: "Active performance tuning. Includes plugin/theme synchronization, broken link logic, and monthly speed optimization audits.", icon: "Construct", color: "from-slate-700 to-slate-900" },
          { title: "Full Dedicated", desc: "Your own development engineers on retainer. Includes unlimited small content changes and dedicated custom feature support.", icon: "Pulse", color: "from-blue-600 to-indigo-700" }
        ],
        integrations: [
          { t: "99.9% Uptime", d: "Zero-latency monitoring" },
          { t: "Malware Decryption", d: "Deep heuristic scanning" },
          { t: "Version Sync", d: "Atomic core updates" },
          { t: "Speed Calibration", d: "LCP/CLS Optimization" }
        ]
      },
      cta: { title: "Initialize Ops Audit" }
    },
    details: {
      hero: {
        badge: "Health Manifest",
        title: "Maintenance Protocol",
        desc: "Software is never finished; it's either evolving or decaying. We treat maintenance as a continuous integrity audit.",
        subtitle: "OPS_SPEC_v4.4"
      },
      sections: {
        phases: [
          { step: "01", stage: "Infrastructure Audit", action: "Baseline security scans and version integrity checks across the entire stack." },
          { step: "02", stage: "Nuclear Backups", action: "Setting up redundant, cross-region daily snapshots with 1-click restoration capability." },
          { step: "03", stage: "Core Synchronization", action: "Atomic updates of CMS cores, frameworks, and plugins with zero-downtime staging tests." },
          { step: "04", stage: "Security Hardening", action: "Implementing WAF rules, login throttling, and real-time malware neutralization." },
          { step: "05", stage: "Speed Calibration", action: "Fine-tuning database queries and LSCache objects to maintain sub-1s LCP metrics." },
          { step: "06", stage: "Health Reporting", action: "Generating high-fidelity technical manifests documenting all system vibration and updates." }
        ],
        roi: [
          { group: "Security Tier", items: ["24/7 SIEM Monitoring", "Brute-force Shielding", "Malware Deep-Scan", "SSL/TLS Integrity"] },
          { group: "Performance Tier", items: ["Core Web Vitals Hub", "Database Optimization", "CDN Asset Purging", "Resource Scaling"] },
          { group: "Persistence Tier", items: ["Off-site S3 Backups", "30-Day Snapshot Log", "Instant Restoration", "Uptime Pulse V4"] }
        ]
      },
      cta: { title: "Initialize Ops Audit" }
    }
  },
  {
    pageType: "hire-student",
    landing: {
      hero: {
        badge: "🔥 Higher Fidelity Talent [POPULAR]",
        title: "Elite Freelance",
        description: "Access our network of rigorously trained, project-tested student talent. Support the next generation while receiving enterprise-grade work at competitive startup rates.",
      },
      sections: {
        pillars: [
          { title: "Core Engineering", desc: "React, Next.js, and Python specialists trained to build resilient frontends and automated internal tools.", icon: "Terminal", color: "from-blue-600 to-indigo-700" },
          { title: "Visual Identity", desc: "Creative students focused on mathematical logo construction, social media branding, and high-impact assets.", icon: "Palette", color: "from-amber-500 to-orange-600" },
          { title: "Performance Growth", desc: "Rigorously trained in SEO fundamentals, Meta Ads, and social strategy to drive measurable business reach.", icon: "Megaphone", color: "from-emerald-600 to-teal-700" }
        ],
        integrations: [
          { t: "Vetted Access", d: "Strict Top 10% filtering" },
          { t: "Senior Oversight", d: "Mandatory lead reviews" },
          { t: "Zero Overhead", d: "Direct portal contracting" },
          { t: "Rapid Bridge", d: "Launch ready in 48hrs" }
        ]
      },
      cta: { title: "Request Talent Bridge" }
    },
    details: {
      hero: {
        badge: "Talent Vetting Manifest",
        title: "The Talent Ecosystem",
        desc: "We bridge the gap between academic brilliance and industrial requirement. Every student in our network has passed a 6-month rigorous internal quality audit.",
        subtitle: "TALENT_BRIDGE_v1.0"
      },
      sections: {
        phases: [
          { step: "01", stage: "Curriculum Sync", action: "Students complete advanced industrial tracks in Web, AI, or Design before entering the network." },
          { step: "02", stage: "Internal Sandbox", action: "Completion of 3 supervised, zero-risk internal projects to verify structural coding standards." },
          { step: "03", stage: "Mentor Stamping", action: "Final code review and personality audit by our Senior Engineering board." },
          { step: "04", stage: "Profile Launch", action: "Dynamic portfolio creation reflecting verified industrial skill scores." },
          { step: "05", stage: "Project Matching", action: "Algorithmic selection based on business tech requirements and student specialization." },
          { step: "06", stage: "Direct Bridge", action: "Project kick-off with mandatory weekly Mentor oversight until final deployment." }
        ],
        roi: [
          { group: "Verification Tier", items: ["Industrial Track Pass", "3 Internal Sandbox Wins", "Mentor Approved", "Git-Standards Checked"] },
          { group: "Specialization Tier", items: ["Fullstack Engineer", "Branding Designer", "SEO / Growth Lead", "Automation Architect"] },
          { group: "Governance Tier", items: ["Direct Portal Contract", "Fixed Milestone Fees", "Mentor Quality Lock", "Asset Delivery Flow"] }
        ]
      },
      cta: { title: "Request Talent Bridge" }
    }
  }
];

const seedManagedServices = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for Managed Services Seeding...");

    for (const service of managedServices) {
      await WebServiceContent.findOneAndUpdate(
        { pageType: service.pageType },
        service,
        { upsert: true, new: true }
      );
      console.log(`Seeded: ${service.pageType}`);
    }

    console.log("Managed Services Seeding Completed!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding Error:", err);
    process.exit(1);
  }
};

seedManagedServices();
