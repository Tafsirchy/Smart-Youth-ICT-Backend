const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: "E:/SYICT/syict-backend/.env" });

const WebServiceContent = require("../src/models/WebServiceContent");

const aiManagedServices = [
  {
    pageType: "chatbot",
    landing: {
      hero: {
        badge: "Neural Intelligence & Conversational AI",
        title: "AI Chatbot & Autonomous Support Agents",
        description:
          "Architecting conversation with precision. We build RAG-powered, multi-channel AI agents that reduce operational friction and drive autonomous engagement.",
      },
      sections: {
        pillars: [
          {
            title: "Neural Architectures",
            desc: "Utilizing Large Language Models (LLMs) to understand context, intent, and sentiment for human-level reasoning.",
            icon: "Chip",
            color: "from-emerald-500 to-teal-600",
          },
          {
            title: "Deterministic Logic",
            desc: "Structured workflow systems designed for high-velocity FAQ handling and precise data collection.",
            icon: "GitNetwork",
            color: "from-blue-500 to-indigo-600",
          },
          {
            title: "Hybrid Governance",
            desc: "Combining AI autonomy with seamless human-agent handoffs for enterprise-grade support reliability.",
            icon: "Analytics",
            color: "from-purple-500 to-fuchsia-600",
          },
        ],
        metrics: [
          {
            t: "99.2% RESOLUTION",
            d: "First-contact resolution rate",
            value: "99.2%",
            label: "Resolution Rate",
          },
          {
            t: "< 250ms INFERENCE",
            d: "Sub-second real-time streaming",
            value: "< 250ms",
            label: "Inference Latency",
          },
          {
            t: "24/7 AUTONOMOUS",
            d: "Zero downtime round-the-clock",
            value: "24/7/365",
            label: "Continuous Support",
          },
          {
            t: "60+ LANGUAGES",
            d: "Native multilingual translation",
            value: "60+",
            label: "Global Dialects",
          },
        ],
        integrations: [
          {
            t: "WhatsApp Business API",
            d: "Direct Meta Cloud webhook synchronization for automated conversational customer engagement.",
          },
          {
            t: "Facebook Messenger",
            d: "Automated social commerce lead routing and instant product inquiry assistance.",
          },
          {
            t: "Native Web Chat",
            d: "Ultra-fast headless React widget with streaming token responses and zero latency.",
          },
          {
            t: "Enterprise CRM & Slack",
            d: "Bi-directional webhook sync with HubSpot, Salesforce, and internal staff alert channels.",
          },
        ],
      },
      cta: {
        badge: "24/7 Autonomous Engagement",
        title: "Your Business Never Sleeps. Neither Does Your AI Agent.",
        subtitle:
          "Book a free AI deployment consultation. We will scope your knowledge base, integration points, and design the perfect autonomous support architecture.",
      },
    },
    details: {
      hero: {
        badge: "Inference Manifest",
        title: "Intelligence Architecture",
        subtitle: "AI_CORE_SPEC_v6.4",
        desc: "We don't just build scripts; we architect autonomous intelligence layers that process intent with surgical precision.",
        description:
          "We don't just build scripts; we architect autonomous intelligence layers that process intent with surgical precision.",
      },
      sections: {
        phases: [
          {
            step: "01",
            stage: "Data Ingestion",
            action:
              "Parsing unstructured business data (PDFs, Docs, CRM) into high-dimensional vector embeddings.",
          },
          {
            step: "02",
            stage: "RAG Architecture",
            action:
              "Implementing Retrieval-Augmented Generation to ensure AI answers are grounded in your specific data.",
          },
          {
            step: "03",
            stage: "Inference Tuning",
            action:
              "Optimizing model temperature, top-p, and system prompts for accurate intent recognition.",
          },
          {
            step: "04",
            stage: "API Orchestration",
            action:
              "Connecting the AI core to your backend systems via secure REST/GraphQL hooks.",
          },
          {
            step: "05",
            stage: "Shadow Testing",
            action:
              "Running the bot in 'listen-only' mode to benchmark accuracy against human agents.",
          },
          {
            step: "06",
            stage: "Active Deployment",
            action:
              "Phased rollout with daily logic pruning and feedback loop integration.",
          },
        ],
        roi: [
          {
            group: "Intelligence Tier",
            items: [
              "GPT-4o / Claude 3.5 Sync",
              "Custom Vector DB",
              "NLP Sentiment Mapping",
              "Zero-Shot Learning",
            ],
          },
          {
            group: "Integrity Tier",
            items: [
              "AES-256 Encryption",
              "SOC-2 Ready Hub",
              "PII Redaction Engine",
              "Rate Limiting V2",
            ],
          },
          {
            group: "Interconnect Tier",
            items: [
              "WhatsApp Webhook API",
              "Websocket Live-stream",
              "CRM Bi-directional Sync",
              "JSON Meta-Payloads",
            ],
          },
        ],
      },
      cta: { title: "Build My AI Agent" },
    },
  },
  {
    pageType: "automation",
    landing: {
      hero: {
        badge: "Workflow & API Integration Engine",
        title: "Business Automation & Workflow Intelligence",
        description:
          "We eliminate the 'human tax' on repetitive tasks. Our automation engines bridge your software stack, creating seamless, hands-free operational flows.",
      },
      sections: {
        pillars: [
          {
            title: "Data Pipeline Automation",
            desc: "Synchronizing data between CRMs, Sheets, and internal databases in real-time with zero latency.",
            icon: "Sync",
            color: "from-cyan-600 to-blue-700",
          },
          {
            title: "RPA & UI Bots",
            desc: "Bot-driven navigation of legacy web apps that lack official API support, bridging digital silos.",
            icon: "Extension",
            color: "from-slate-700 to-slate-900",
          },
          {
            title: "DevOps & Cloud Triggers",
            desc: "Automated testing, deployment, and infrastructure scaling triggers for high-frequency releases.",
            icon: "Flash",
            color: "from-blue-600 to-indigo-800",
          },
        ],
        metrics: [
          {
            t: "40+ HRS / WEEK",
            d: "Average manual hours saved per team",
            value: "40+ Hrs",
            label: "Weekly Saved",
          },
          {
            t: "ZERO ERRORS",
            d: "Eliminate human copy-paste errors",
            value: "0%",
            label: "Data Discrepancy",
          },
          {
            t: "100+ WEBHOOKS",
            d: "Direct API triggers across platforms",
            value: "100+",
            label: "Native Connectors",
          },
          {
            t: "5X OPS SCALE",
            d: "Scale operational throughput with same headcount",
            value: "5x",
            label: "Throughput Scale",
          },
        ],
        integrations: [
          {
            t: "Zapier & Make.com Master",
            d: "Multi-branch logic routers with automated error recovery and notification queues.",
          },
          {
            t: "Custom Microservice Webhooks",
            d: "Direct server-to-server HTTP pipelines with HMAC signature verification.",
          },
          {
            t: "Google Workspace & 365",
            d: "Automated spreadsheet parsing, doc generation, and instant calendar triggers.",
          },
          {
            t: "Payment & Invoicing Flow",
            d: "Stripe, bKash, and QuickBooks event-driven invoice reconciliation and receipt emission.",
          },
        ],
      },
      cta: {
        badge: "Zero-Friction Business Ops",
        title: "Stop Doing Manually What Can Be Automated Permanently.",
        subtitle:
          "Schedule a free workflow audit. We will map your existing processes and identify the highest-ROI automation opportunities.",
      },
    },
    details: {
      hero: {
        badge: "Efficiency Manifest",
        title: "Logic Blueprints",
        subtitle: "Efficiency Specifications",
        desc: "Automation is not a task; it's a structural optimization of human time and organizational throughput.",
        description:
          "Automation is not a task; it's a structural optimization of human time and organizational throughput.",
      },
      sections: {
        phases: [
          {
            step: "01",
            stage: "Workflow Mapping",
            action:
              "Auditing current manual bottlenecks and identifying high-frequency data handover points.",
          },
          {
            step: "02",
            stage: "Node Scaffolding",
            action:
              "Constructing webhook endpoints and middleware schemas using Make.com or custom microservices.",
          },
          {
            step: "03",
            stage: "Payload Serialization",
            action:
              "Transforming and validating API response payloads between mismatched data schemas.",
          },
          {
            step: "04",
            stage: "Error Handling Logic",
            action:
              "Implementing automatic fallback queues and instant Slack/Email alerts for failed webhook retries.",
          },
          {
            step: "05",
            stage: "Dry-Run Staging",
            action:
              "Testing with live production event mirrors to verify data integrity without side-effects.",
          },
          {
            step: "06",
            stage: "Autonomous Production",
            action:
              "Full switchover to autonomous processing with real-time health telemetry.",
          },
        ],
        roi: [
          {
            group: "Labor Reduction",
            items: [
              "Automated Invoicing",
              "CRM Sync in Real-Time",
              "Lead Routing < 5s",
              "Report Generation",
            ],
          },
          {
            group: "Error Mitigation",
            items: [
              "Zero Schema Mismatch",
              "Automated Retries",
              "Audit Log Tracking",
              "Data Cleansing",
            ],
          },
          {
            group: "High-Speed Scaling",
            items: [
              "10,000+ Daily Tasks",
              "Sub-second Execution",
              "Serverless Scalability",
              "Cost-Efficient Ops",
            ],
          },
        ],
      },
      cta: { title: "Initialize Your Automation Audit" },
    },
  },
  {
    pageType: "hosting",
    landing: {
      hero: {
        badge: "High-Availability Cloud Network",
        title: "Web Hosting & Domain Infrastructure",
        description:
          "We don't just host; we safeguard your digital presence. Our specialized hosting solutions are engineered for zero-downtime, sub-second latency, and horizontal scalability.",
      },
      sections: {
        pillars: [
          {
            title: "NVMe Cloud Architecture",
            desc: "Ultra-fast PCIe Gen4 NVMe storage arrays delivering up to 100,000 IOPS for instantaneous database queries.",
            icon: "Server",
            color: "from-blue-600 to-indigo-700",
          },
          {
            title: "Hardware DDoS Shield",
            desc: "Always-on multi-terabit scrubbing centers protecting your origin server against Layer 3/4 and Layer 7 attacks.",
            icon: "Shield",
            color: "from-slate-700 to-slate-900",
          },
          {
            title: "Global Anycast Edge",
            desc: "300+ edge points of presence delivering static assets and cached HTML within 20 milliseconds worldwide.",
            icon: "Globe",
            color: "from-emerald-500 to-teal-700",
          },
        ],
        metrics: [
          {
            t: "99.99% UPTIME",
            d: "Financially-backed SLA guarantee",
            value: "99.99%",
            label: "Uptime SLA",
          },
          {
            t: "< 50ms TTFB",
            d: "Ultra-low time-to-first-byte globally",
            value: "< 50ms",
            label: "Global TTFB",
          },
          {
            t: "100Gbps+ DDoS",
            d: "Automated network layer mitigation",
            value: "100Gbps+",
            label: "DDoS Mitigation",
          },
          {
            t: "DAILY S3 BACKUP",
            d: "Off-site encrypted immutable snapshots",
            value: "Daily",
            label: "Snapshots",
          },
        ],
        plans: [
          {
            name: "Standard Cloud",
            desc: "Ideal for business websites and corporate portfolios requiring guaranteed uptime.",
            monthlyPrice: 9.99,
            annualPrice: 95.88,
            popular: false,
            features: [
              "Single Website",
              "25 GB NVMe Storage",
              "Unmetered Bandwidth",
              "Free SSL Certificate",
              "Daily Automated Backups",
              "Standard Support",
            ],
          },
          {
            name: "Performance Node",
            desc: "Optimized for e-commerce, high-traffic portals, and dynamic web applications.",
            monthlyPrice: 24.99,
            annualPrice: 239.88,
            popular: true,
            features: [
              "Unlimited Websites",
              "100 GB Gen4 NVMe",
              "Free Domain Registration (1st Yr)",
              "Isolated Memory & CPU Cores",
              "Global CDN & LSCache Included",
              "Priority 24/7 SRE Support",
            ],
          },
          {
            name: "Enterprise Dedicated",
            desc: "Isolated single-tenant instance with dedicated CPU threads and customized compliance.",
            monthlyPrice: 79.99,
            annualPrice: 767.88,
            popular: false,
            features: [
              "Dedicated Hardware Core",
              "250 GB Pure NVMe RAID-10",
              "Custom PHP/Node/Python Runtimes",
              "Dedicated IP Address",
              "Enterprise WAF & SOC-2 Compliance",
              "15-Minute Response SLA",
            ],
          },
        ],
      },
      cta: {
        badge: "Enterprise Infrastructure",
        title: "Launch Your Digital Infrastructure on Unbreakable Foundations.",
        subtitle:
          "Schedule a hosting consultation. We will recommend the optimal stack for your traffic, compliance, and performance requirements.",
      },
    },
    details: {
      hero: {
        badge: "Technical Specification Protocol",
        title: "Infrastructure Integrity",
        subtitle: "Cloud Infrastructure Manifest",
        desc: "Enterprise-grade cloud architectures built with redundant hardware, carrier-neutral transit, and zero single point of failure.",
        description:
          "Enterprise-grade cloud architectures built with redundant hardware, carrier-neutral transit, and zero single point of failure.",
      },
      sections: {
        phases: [
          {
            step: "01",
            stage: "DNS Zone Provisioning",
            action:
              "Deploying Anycast DNS clusters with sub-second TTL propagation and DNSSEC cryptographic protection.",
          },
          {
            step: "02",
            stage: "Hypervisor Allocation",
            action:
              "Carving guaranteed CPU and memory slices with zero noisy-neighbor resource throttling.",
          },
          {
            step: "03",
            stage: "Storage Pool Mount",
            action:
              "Configuring redundant RAID-10 NVMe volume arrays with continuous background parity verification.",
          },
          {
            step: "04",
            stage: "Network Route Optimization",
            action:
              "Routing through Tier-1 transit providers (Level3, Telia, Cogent) with automated BGP failover.",
          },
          {
            step: "05",
            stage: "SSL Handshake Sync",
            action:
              "Issuing automated Let's Encrypt Wildcard certificates with HTTP/3 and QUIC transport enabled.",
          },
          {
            step: "06",
            stage: "Continuous Telemetry",
            action:
              "Prometheus and Grafana daemon hooks sending real-time alerts on CPU, memory, and packet anomalies.",
          },
        ],
        roi: [
          {
            group: "Compute Performance",
            items: [
              "AMD EPYC™ 4.0GHz+ Processors",
              "DDR5 ECC Registered RAM",
              "Sub-10ms DB Query Times",
              "LSCache Object Caching",
            ],
          },
          {
            group: "Network Reliability",
            items: [
              "99.99% Uptime SLA",
              "Multi-Gigabit Uplinks",
              "Anycast Edge POPs",
              "BGP Peering Optimization",
            ],
          },
          {
            group: "Security Hardening",
            items: [
              "Hardware WAF Layer",
              "Layer 7 DDoS Scrubbing",
              "Automated Malware Filter",
              "Daily S3 Off-site Snapshots",
            ],
          },
        ],
      },
      cta: { title: "Initialize Cloud Instance" },
    },
  },
  {
    pageType: "maintenance",
    landing: {
      hero: {
        badge: "Zero-Downtime Infrastructure Guarantee",
        title: "Website Maintenance & System Guard",
        description:
          "We don't just fix bugs; we maintain momentum. Our proactive maintenance cycles ensure your software stays secure, fast, and ahead of the competition.",
      },
      sections: {
        pillars: [
          {
            title: "Security & Core Guard",
            desc: "The structural essentials. Weekly off-site backups, core engine updates, and 24/7 malware monitoring to keep your node live.",
            icon: "ShieldCheckmark",
            color: "from-teal-600 to-emerald-700",
          },
          {
            title: "Standard Ops Tuning",
            desc: "Active performance tuning. Includes plugin/theme synchronization, broken link logic, and monthly speed optimization audits.",
            icon: "Construct",
            color: "from-slate-700 to-slate-900",
          },
          {
            title: "Dedicated Retainer SLA",
            desc: "Your own development engineers on retainer. Includes unlimited small content changes and dedicated custom feature support.",
            icon: "Pulse",
            color: "from-blue-600 to-indigo-700",
          },
        ],
        metrics: [
          {
            t: "99.9% UPTIME",
            d: "Zero-latency health monitoring",
            value: "99.9%",
            label: "Uptime Guaranteed",
          },
          {
            t: "ZERO VULNERABILITIES",
            d: "Continuous CVE heuristic scanning",
            value: "0",
            label: "Active Vulnerabilities",
          },
          {
            t: "ATOMIC UPDATES",
            d: "Staged sandbox testing before push",
            value: "100%",
            label: "Sandbox Tested",
          },
          {
            t: "< 1h HOTFIX SLA",
            d: "Rapid response emergency engineer",
            value: "< 1h",
            label: "Incident Response",
          },
        ],
        integrations: [
          {
            t: "24/7 Uptime Sentinel",
            d: "Sub-minute HTTP, SSL, and DNS ping monitors globally.",
          },
          {
            t: "Deep Malware Neutralizer",
            d: "Real-time file integrity monitoring and automated malware quarantine.",
          },
          {
            t: "Atomic Core Sync",
            d: "Automated regression tests during framework and module updates.",
          },
          {
            t: "Core Web Vitals Calibrator",
            d: "Monthly CSS/JS audit to maintain sub-1 second Largest Contentful Paint.",
          },
        ],
      },
      cta: {
        badge: "Continuous Uptime & Protection",
        title: "Your Platform Never Gets Sick. We Keep It That Way.",
        subtitle:
          "Schedule a free systems audit. We will inspect your uptime, security posture, plugin stack, and performance metrics.",
      },
    },
    details: {
      hero: {
        badge: "Systems Continuity Protocol",
        title: "Stability Logic",
        subtitle: "Performance Specifications",
        desc: "Technical manifest of our maintenance and support protocols. Proactive engineering eliminates catastrophic downtime before it impacts revenue.",
        description:
          "Technical manifest of our maintenance and support protocols. Proactive engineering eliminates catastrophic downtime before it impacts revenue.",
      },
      sections: {
        phases: [
          {
            step: "01",
            stage: "Baseline Diagnostics",
            action:
              "Full vulnerability assessment and Core Web Vitals telemetry audit to establish current platform baseline.",
          },
          {
            step: "02",
            stage: "Off-site Backup Sync",
            action:
              "Deploying automated daily S3 immutable snapshots with 1-click sandbox restoration capability.",
          },
          {
            step: "03",
            stage: "Core Synchronization",
            action:
              "Atomic updates of CMS cores, frameworks, and plugins with zero-downtime staging tests.",
          },
          {
            step: "04",
            stage: "Security Hardening",
            action:
              "Implementing WAF rules, login throttling, and real-time malware neutralization.",
          },
          {
            step: "05",
            stage: "Speed Calibration",
            action:
              "Fine-tuning database queries and LSCache objects to maintain sub-1s LCP metrics.",
          },
          {
            step: "06",
            stage: "Health Reporting",
            action:
              "Generating high-fidelity technical manifests documenting all system metrics and updates.",
          },
        ],
        roi: [
          {
            group: "Security Tier",
            items: [
              "24/7 SIEM Monitoring",
              "Brute-force Shielding",
              "Malware Deep-Scan",
              "SSL/TLS Integrity",
            ],
          },
          {
            group: "Performance Tier",
            items: [
              "Core Web Vitals Hub",
              "Database Optimization",
              "CDN Asset Purging",
              "Resource Scaling",
            ],
          },
          {
            group: "Persistence Tier",
            items: [
              "Off-site S3 Backups",
              "30-Day Snapshot Log",
              "Instant Restoration",
              "Uptime Pulse V4",
            ],
          },
        ],
      },
      cta: { title: "Initialize Ops Audit" },
    },
  },
  {
    pageType: "hire-student",
    landing: {
      hero: {
        badge: "Vetted Academic Talent Pool",
        title: "Hire Verified & Student Talent",
        description:
          "Inject fresh perspective and cutting-edge energy into your projects. Access the top 1% of our mentored graduates, trained in industrial standards and managed by senior leads.",
      },
      sections: {
        pillars: [
          {
            title: "Frontend & Fullstack",
            desc: "React, Next.js, Tailwind, and Node.js specialists trained to build resilient frontends and automated internal tools.",
            icon: "Terminal",
            color: "from-blue-600 to-indigo-700",
          },
          {
            title: "UI/UX & Branding",
            desc: "Creative students focused on Figma design tokens, human ergonomics, and high-impact conversion assets.",
            icon: "Palette",
            color: "from-amber-500 to-orange-600",
          },
          {
            title: "Performance Growth",
            desc: "Rigorously trained in SEO fundamentals, Meta Ads, and content marketing to drive measurable business reach.",
            icon: "Megaphone",
            color: "from-emerald-600 to-teal-700",
          },
        ],
        metrics: [
          {
            t: "TOP 1% VETTING",
            d: "Rigorous 6-month hands-on selection",
            value: "Top 1%",
            label: "Strict Selection",
          },
          {
            t: "100% MENTOR-BACKED",
            d: "Senior engineers review all deliverables",
            value: "100%",
            label: "Mentor Supervised",
          },
          {
            t: "48H ONBOARDING",
            d: "Matched and ready to sprint in 2 days",
            value: "48h",
            label: "Rapid Placement",
          },
          {
            t: "98% CLIENT CSAT",
            d: "High-satisfaction commercial delivery",
            value: "98%",
            label: "Client CSAT",
          },
        ],
        integrations: [
          {
            t: "Vetted Access Gateway",
            d: "Direct portfolio view with authenticated GitHub repositories and verifiable live apps.",
          },
          {
            t: "Senior Mentor Oversight",
            d: "Every milestone verified by SYICT engineering directors before deployment.",
          },
          {
            t: "Zero Agency Overhead",
            d: "Transparent, student-friendly direct milestone contracts without hidden fees.",
          },
          {
            t: "Rapid Bridge Deployment",
            d: "Match your tech stack with ready talent in under 48 hours for immediate kickoff.",
          },
        ],
      },
      cta: {
        badge: "Vetted Academic Network",
        title: "Access Mentor-Supervised Student Talent Today.",
        subtitle:
          "Connect with our talent sourcing team. We match you with vetted, mentor-supervised student professionals within 48 hours.",
      },
    },
    details: {
      hero: {
        badge: "Talent Vetting Manifest",
        title: "Talent Integrity",
        subtitle: "Vetting Specifications",
        desc: "A rigorous, multi-layered vetting manifest ensuring only the top 1% of graduates bridge to your enterprise projects.",
        description:
          "A rigorous, multi-layered vetting manifest ensuring only the top 1% of graduates bridge to your enterprise projects.",
      },
      sections: {
        phases: [
          {
            step: "01",
            stage: "Curriculum Sync",
            action:
              "Students complete advanced industrial tracks in Web, AI, or Design before entering the network.",
          },
          {
            step: "02",
            stage: "Internal Sandbox",
            action:
              "Completion of 3 supervised, zero-risk internal projects to verify structural coding standards.",
          },
          {
            step: "03",
            stage: "Mentor Stamping",
            action:
              "Final code review and personality audit by our Senior Engineering board.",
          },
          {
            step: "04",
            stage: "Profile Launch",
            action:
              "Dynamic portfolio creation reflecting verified industrial skill scores.",
          },
          {
            step: "05",
            stage: "Project Matching",
            action:
              "Algorithmic selection based on business tech requirements and student specialization.",
          },
          {
            step: "06",
            stage: "Direct Bridge",
            action:
              "Project kick-off with mandatory weekly Mentor oversight until final deployment.",
          },
        ],
        roi: [
          {
            group: "Verification Tier",
            items: [
              "Industrial Track Pass",
              "3 Internal Sandbox Wins",
              "Mentor Approved",
              "Git-Standards Checked",
            ],
          },
          {
            group: "Specialization Tier",
            items: [
              "Fullstack Engineer",
              "Branding Designer",
              "SEO / Growth Lead",
              "Automation Architect",
            ],
          },
          {
            group: "Governance Tier",
            items: [
              "Direct Portal Contract",
              "Fixed Milestone Fees",
              "Mentor Quality Lock",
              "Asset Delivery Flow",
            ],
          },
        ],
      },
      cta: { title: "Request Talent Bridge" },
    },
  },
];

async function seed() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("Connected successfully!");

    for (const service of aiManagedServices) {
      const res = await WebServiceContent.findOneAndUpdate(
        { pageType: service.pageType },
        { $set: service },
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`Successfully seeded [${service.pageType}]:`, {
        landingHero: res.landing?.hero?.title,
        pillarsCount: res.landing?.sections?.pillars?.length,
        metricsCount: res.landing?.sections?.metrics?.length,
        plansCount: res.landing?.sections?.plans?.length,
        detailsHero: res.details?.hero?.title,
      });
    }

    console.log("All 5 AI & Managed Services seeded successfully with 100% data integrity!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();

