const mongoose = require("mongoose");
require("dotenv").config();
const WebServiceContent = require("./src/models/WebServiceContent");

const seedData = [
  {
    pageType: "portfolio-websites",
    landing: {
      hero: {
        badge: "Digital Legacy Builder",
        title: "Portfolio Websites",
        subtitle: "Websites",
        description: "We don't build websites; we engineer digital pedestals. Your work is extraordinary—it deserves a frame that amplifies its resonance and power.",
        mainImage: "https://images.unsplash.com/photo-1541462608143-67571c6738dd?w=1000&h=1200&fit=crop",
      },
      sections: {
        philosophies: [
          { title: "Minimalist / Nordic", desc: "A surgical focus on negative space and clean typography. Ideal for photographers, architects, and high-end fashion designers.", icon: "Layers", color: "from-slate-900 to-slate-800", shadow: "shadow-slate-500/10" },
          { title: "Editorial Magazine", desc: "Dynamic imagery with bold, editorial layouts that make your content feel like a premium publication or luxury lookbook.", icon: "Palette", color: "from-rose-600 to-pink-500", shadow: "shadow-rose-500/20" },
          { title: "Creative Immersive", desc: "Utilizing deep interactions and subtle motion architectures to pull visitors into your unique creative world.", icon: "Flash", color: "from-emerald-600 to-teal-500", shadow: "shadow-emerald-500/20" }
        ],
        phases: [
          { id: "01", t: "Architecture & Strategy", d: "Mapping your professional narrative and defining your conversion goals." },
          { id: "02", t: "Immersive Design", d: "Crafting a bespoke aesthetic fingerprint that resonates with your industry." },
          { id: "03", t: "High-Octane Build", d: "Engineering using Next.js for sub-second load times and global scalability." },
          { id: "04", t: "SEO Optimization", d: "Injecting technical SEO to ensure your portfolio ranks for your key expertises." },
          { id: "05", t: "Global Launch", d: "Deploying to edge networks with custom performance monitoring active." }
        ],
        pricing: [
          { t: "Starter", p: "$499", list: ["SPA Architecture", "Lightning Fast", "Social Integration", "Vercel Edge Launch"], color: "rose", highlight: false },
          { t: "Professional", p: "$1299", list: ["Multi-Page Narratives", "Dynamic CMS Hub", "Custom Motion System", "Technical SEO Pack", "Lead Gen Integration"], color: "slate", highlight: true },
          { t: "Legacy (Agency)", p: "$3499", list: ["Custom 3D Interactions", "Immersive Audio Experience", "Whiteset Design Philosophy", "Dedicated Launch Suite", "Brand Identity Pack"], color: "emerald", highlight: false }
        ]
      },
      cta: { title: "Ready to build your Digital Legacy?" }
    },
    details: {
      hero: { badge: "Initializing Detail Protocol", title: "Technical Luxury", subtitle: "Luxury", description: "Technical Luxury Protocol Initialized" },
      sections: {
        techStack: [
          { t: "Next.js 14", d: "The core engine for SSG & ISR, delivering sub-second hydration and global scalability.", icon: "Layers", color: "bg-slate-900", colSpan: "md:col-span-2" },
          { t: "Vercel Edge", d: "Deployed on 100+ global edge locations for zero latency.", icon: "Globe", color: "bg-emerald-600", colSpan: "md:col-span-1" },
          { t: "Framer Motion", d: "High-performance physics-based animation system.", icon: "Flash", color: "bg-rose-500", colSpan: "md:col-span-1" },
          { t: "Schema.org", d: "Structured JSON-LD injections for elite search rankings.", icon: "Shield", color: "bg-indigo-600", colSpan: "md:col-span-2" }
        ],
        checklist: [
          { t: "Storytelling Bio", d: "Craft a narrative that connects with high-value clients." },
          { t: "Visual Artifacts", d: "4K renders or screenshots of your production work." },
          { t: "Proof of Authority", d: "Links to case studies, GitHub, or client reviews." },
          { t: "Identity Links", d: "A consolidated list of all professional handles." }
        ],
        codeSnippet: {
          title: "Architecturally Clean.",
          description: "All SYICT portfolios feature atomic structuring. We isolate concerns, ensuring your code is ready for future scaling.",
          tags: ["TypeScript Core", "Atomic CSS", "Clean Routes", "Edge Cache"],
          code: `export const PortfolioConfig = {
  performance: "ultra_fast",
  animations: "immersive_physics",
  deployment: {
    provider: "Vercel Edge",
    ssl: true
  },
  seo: ["Schema.org", "JSON-LD"]
};`,
          fileName: "portfolio-config.ts"
        }
      },
      cta: { title: "Ready to unlock your Online Power?" }
    }
  },
  {
    pageType: "business-websites",
    landing: {
      hero: {
        badge: "Architecture for Scale",
        title: "Business Websites",
        subtitle: "Websites",
        description: "We don't just build websites; we engineer conversion assets that amplify your brand’s authority and operational efficiency globally.",
        mainImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&h=800&fit=crop",
      },
      sections: {
        verticals: [
          { title: "Startup & SaaS", desc: "Built for speed and conversion. We engineer aggressive growth funnels designed to turn traffic into trial users instantly.", icon: "Rocket", color: "from-blue-500 to-blue-600", border: "border-blue-100" },
          { title: "Enterprise Corporate", desc: "Stability and brand authority. High-security, multi-lingual architectures designed for investor relations and global presence.", icon: "Business", color: "from-slate-700 to-slate-800", border: "border-slate-100" },
          { title: "Professional Agency", desc: "Service-centric storytelling. We build elegant lead-generation hubs designed to showcase expertise and qualify high-value clients.", icon: "Briefcase", color: "from-cyan-500 to-blue-500", border: "border-cyan-100" }
        ],
        integrations: [
          { t: "CRM Sync", d: "HubSpot, Salesforce, Zoho integration.", icon: "GitNetwork" },
          { t: "Payment Gateways", d: "Stripe, SSLCommerz, PayPal native.", icon: "Globe" },
          { t: "Marketing Automations", d: "Mailchimp, Resend, Meta Pixel.", icon: "Analytics" },
          { t: "Uptime Shield", d: "24/7 Monitoring & DDoS protection.", icon: "Shield" }
        ],
        pricing: [
          { t: "Standard Business", p: "$1499", list: ["SME Focused Strategy", "100ms Edge Load", "Mobile Responsive Architecture", "Core SEO Pack", "24/7 Security Shield"], color: "slate", highlight: false },
          { t: "Growth Pro", p: "$3499", list: ["CRM Flow Integration", "A/B Conversion Testing", "Multi-Language Support", "Advanced ROI Dashboard", "Dedicated Architect Access"], color: "blue", highlight: true },
          { t: "Enterprise Suite", p: "Custom", list: ["Custom API Integrations", "Multi-Vendor Marketplaces", "Whitelabel Design Flow", "Dedicated SLA Support", "Legacy Data Migration"], color: "indigo", highlight: false }
        ]
      },
      cta: { title: "Ready to activate your Online Engine?" }
    },
    details: {
      hero: { badge: "Technical Specification Protocol", title: "Business Intelligence", subtitle: "Intelligence", description: "We deliver industrial-grade web infrastructure designed to scale with your organization. Here is the technical manifest of our business engines." },
      sections: {
        roi: [
          { title: "ROI Convergence", desc: "Our engines are built with a single KPI in mind: Conversion. By isolating common friction points in standard builders, we reduce bounce rates by up to 64% from the first month.", icon: "Stats", features: ["Behavioral Heatmapping", "Zero-Friction Forms", "Fast-Action CTAs"] },
          { title: "Technical Integrity", desc: "Native SSR (Server-Side Rendering) ensures that Google sees every byte of your content instantly, granting you an immediate technical SEO advantage.", icon: "Chip", features: ["Type-Safe Production", "Edge CDN Caching", "Atomic Code Standards"] }
        ],
        manifest: [
          { label: "Core Architecture", value: "Next.js 14 + TypeScript" },
          { label: "Data Management", value: "Server-Side Rendering (SSR)" },
          { label: "Global Delivery", value: "Vercel Edge Network" },
          { label: "SEO Protocol", value: "Schema.org + JSON-LD" },
          { label: "Security Layer", value: "SSL + DDoS Mitigation" },
          { label: "Analytics Stack", value: "GTM + Custom ROI Tracking" }
        ],
        checklist: [
          { t: "Brand Identity Asset Bundle", d: "High-resolution logos, brand color codes (HEX/RGB), and corporate fonts." },
          { t: "Service Hierarchy Document", d: "Complete breakdown of services, pricing tiers, and organizational structure." },
          { t: "Leadership Artifacts", d: "Professional bios and portraits of the executive board members." },
          { t: "Operational KPIs", d: "Clear definition of what leads or conversions matter most to your bottom line." },
          { t: "Legal Documentation", d: "Privacy policies, Terms of Service, and industry-specific compliance data." }
        ]
      },
      cta: { title: "Ready to activate your Corporate Presence?" }
    }
  },
  {
    pageType: "ecommerce",
    landing: {
      hero: {
        badge: "Conversion-First Architecture",
        title: "E-commerce Development",
        subtitle: "Development",
        description: "We don't just build 'stores'. We architect high-conversion transaction engines designed for massive scale, absolute security, and fluid global deployment.",
      },
      sections: {
        verticals: [
          { title: "Direct-to-Consumer (D2C)", desc: "Bespoke storefronts engineered for single-brand dominance. Focus on high-speed product grids and frictionless 1-click checkouts.", icon: "Cart", color: "from-rose-500 to-rose-600", border: "border-rose-100" },
          { title: "Multi-Vendor Marketplace", desc: "Complex architectures allowing hundreds of sellers to manage inventory. Includes robust commission engines and vendor dashboards.", icon: "People", color: "from-slate-700 to-slate-800", border: "border-slate-100" },
          { title: "B2B Bulk Portals", desc: "Wholesale ordering systems with tiered pricing, inventory reservation, and automated quotation systems for bulk trade.", icon: "BagCheck", color: "from-emerald-500 to-emerald-600", border: "border-emerald-100" }
        ],
        integrations: [
          { t: "Payment Logistics", d: "Native SSLCommerz, bKash, Nagad & Stripe sync.", icon: "Card" },
          { t: "Inventory Protocol", d: "Real-time sync with ERP & Warehouse systems.", icon: "GitNetwork" },
          { t: "Global Logistics", d: "Automated Pathao, ShipStation & DHL integration.", icon: "Globe" },
          { t: "Fraud Shield", d: "AI-driven order verification & fraud prevention.", icon: "Shield" }
        ],
        pricing: [
          { t: "D2C Foundations", p: "$1999", list: ["Single Brand Architecture", "Native Mobile Speed", "Global Payment Gateways", "SEO Commerce Pack", "Standard Inventory Sync"], color: "slate", highlight: false },
          { t: "Aggressive Growth", p: "$4499", list: ["Headless Commerce Logic", "Advanced Cart Recovery", "Omni-channel Support", "High-Level ROI Dashboard", "Priority Logistics Sync"], color: "rose", highlight: true },
          { t: "Marketplace Suite", p: "Custom", list: ["Multi-Vendor Capability", "Complex Commission Engine", "Full Warehouse API", "Dedicated Security Layer", "Legacy Site Migration"], color: "crimson", highlight: false }
        ]
      },
      cta: { title: "Ready to activate your Commerce Engine?" }
    },
    details: {
      hero: { badge: "Technical Specification Protocol", title: "Commerce Integrity", description: "We deliver zero-friction online storefronts designed for massive scale. Here is the technical manifest of our commerce engines." },
      sections: {
        roi: [
          { title: "Sub-Second Velocity", desc: "By leveraging Next.js Server Components (RSC), we eliminate client-side JS overhead, delivering instantaneous product filtering and checkout flows.", icon: "Flash", features: ["Instant Search Indexing", "Edge-Cached Images", "Optimized Core Web Vitals"] },
          { title: "Transaction Shield", desc: "Native integration with 3D Secure 2.0 and automated fraud detection ensures your revenue is protected from the first transaction.", icon: "Shield", features: ["PCI-DSS Level 1 Logic", "Automated AML Checks", "Encrypted Data Vaults"] }
        ],
        manifest: [
          { label: "Core Infrastructure", value: "Next.js 14 (App Router) + TypeScript" },
          { label: "Commerce Logic", value: "Headless (Medusa / Shopify / Node.js)" },
          { label: "Data Delivery", value: "Server Components (RSC) + Suspense" },
          { label: "Global Edge", value: "Vercel / AWS CloudFront" },
          { label: "Sync Engine", value: "Redis-backed Real-time Inventory" },
          { label: "Payment Security", value: "PCI-DSS Level 1 Compliant Integration" }
        ],
        checklist: [
          { t: "SKU & Catalog Manifest", d: "Structured CSV/JSON of products, variants, pricing, and inventory levels." },
          { t: "Payment Gateway Credentials", d: "Production/Sandbox keys for SSLCommerz, bKash, Nagad, or Stripe." },
          { t: "Logistics API Protocols", d: "Courier service account IDs and webhook endpoints for automated shipping." },
          { t: "Brand Asset Architecture", d: "High-fidelity vectors, product photography, and typography systems." },
          { t: "Legal & Compliance Data", d: "Localized terms of service, refund protocols, and privacy documentation." }
        ]
      },
      cta: { title: "Initialize Your Commerce Engine." }
    }
  },
  {
    pageType: "custom-apps",
    landing: {
      hero: {
        badge: "Bespoke Engineering Protocol",
        title: "Custom Web Applications",
        subtitle: "Applications",
        description: "We don't build MVP's; we engineer digital sovereignty. Our custom software infrastructure is built on clean-code principles and future-proof logic.",
      },
      sections: {
        verticals: [
          { title: "Multi-tenant SaaS", desc: "Single-codebase architectures with logic-level isolation, unified subscription handling, and horizontal scaling metrics.", icon: "Cube", color: "from-violet-500 to-indigo-600" },
          { title: "Mission Critical Portals", desc: "High-security internal hubs for employee management, secure data vaults, and complex organizational hierarchies.", icon: "Shield", color: "from-slate-700 to-slate-900" },
          { title: "Real-time Engines", desc: "Native WebSocket integration for financial dashboards, live telemetry, and low-latency interaction hubs.", icon: "Sync", color: "from-fuchsia-600 to-violet-600" }
        ],
        integrations: [
          { group: "Logic Execution", tags: ["Node.js 20+", "Python FastAPI", "Go Fiber"] },
          { group: "Infrastructure", tags: ["AWS Lambda", "Edge Computing", "Docker Swarm"] },
          { group: "Persistence", tags: ["PostgreSQL", "Redis Cache", "Vector DB"] },
          { group: "Security", tags: ["JWT/OAuth2", "Argon2 Hash", "AES-256"] }
        ],
        pricing: [
          { t: "Core MVP", p: "$2499", list: ["Proof of Concept Logic", "Single-Platform Auth", "Atomic UI Kit", "PostgreSQL Persistence", "2-Week Discovery Sprint"], color: "slate", highlight: false },
          { t: "Professional Engine", p: "$5999", list: ["Multi-Tenant SaaS Flow", "Third-party API Sync", "Real-time Event Bridge", "Automated QA Suite", "Vercel/AWS Edge Deploy"], color: "violet", highlight: true },
          { t: "Enterprise Ecosystem", p: "Custom", list: ["Legacy Data Migration", "Multi-Vendor Integration", "Zero-Trust Architecture", "Dedicated DevOps Support", "Full IP Transfer"], color: "indigo", highlight: false }
        ]
      },
      cta: { title: "Ready to initialize your Bespoke Platform?" }
    },
    details: {
      hero: { badge: "Technical Specification Protocol", title: "Bespoke Architecture", description: "We eliminate the constraints of standard software. This manifest outlines the industrial-grade protocols used to engineer your custom digital assets." },
      sections: {
        phases: [
          { t: "Discovery Sprint", d: "Deep-dive mapping of user stories, business logic, and edge-case protocols.", icon: "Settings", step: "01" },
          { t: "Architecture Blueprint", d: "Selection of persistent layers, API schemas, and horizontal scaling strategies.", icon: "GitNetwork", step: "02" },
          { t: "Agile Development", d: "Bi-weekly sprint releases with continuous feedback and logic hardening.", icon: "Code", step: "03" },
          { t: "Security Auditing", d: "Automated pen-testing, JWT validation checks, and data encryption verification.", icon: "Shield", step: "04" },
          { t: "CI/CD Deployment", d: "Zero-downtime deployment to production using automated pipeline triggers.", icon: "CloudUpload", step: "05" },
          { t: "Hyper-care Phase", d: "24/7 post-launch monitoring, cache warming, and performance tuning.", icon: "Time", step: "06" }
        ],
        manifest: [
          { label: "Execution Layer", value: "Node.js 20+ / Python FastAPI / Go Fiber" },
          { label: "State Management", value: "Redis Cache / Persistent WebSockets" },
          { label: "Data Architecture", value: "PostgreSQL / Prisma ORM / Row-Level Security" },
          { label: "Infra & DevOps", value: "Docker / AWS Lambda / Vercel Edge" },
          { label: "Auth & Identity", value: "OAuth2 / JWT / Argon2-level Hardening" },
          { label: "API Protocol", value: "RESTful / GraphQL / gRPC options" }
        ],
        roi: [
          { title: "Zero-Trust Access", desc: "Implementation of tiered authentication scopes, encrypted user sessions, and hardware-level isolation for sensitive operation blocks.", icon: "Shield", protocol: "JWT / OAuth2 / PKCE" },
          { title: "Data Sovereignty", desc: "All persistent data is encrypted at rest using AES-256 standard, with automated weekly backups to multi-region cloud vaults.", icon: "Chip", protocol: "AES-256 / SSL / TLS 1.3" }
        ]
      },
      cta: { title: "Start Your Engineering Brief." }
    }
  },
  {
    pageType: "erp-crm",
    landing: {
      hero: {
        badge: "Operation Ecosystem Prototype",
        title: "ERP / CRM / POS Systems",
        subtitle: "Systems",
        description: "We don't build software; we architect business efficiency. Our systems integrate ERP, CRM, and POS into a unified, high-vibration command center.",
      },
      sections: {
        verticals: [
          { title: "HRM & Strategic Payroll", desc: "Automated attendance, leave management, and localized tax/bonus logic for your entire workforce.", icon: "People", color: "from-teal-600 to-emerald-700" },
          { title: "Inventory & SC Control", desc: "Multi-warehouse tracking with automated re-order thresholds and low-stock SMS alerting engines.", icon: "Layers", color: "from-amber-600 to-orange-700" },
          { title: "Sales & CRM Intelligence", desc: "Lead pipeline management, automated stakeholder follow-ups, and customer lifetime value (LTV) analytics.", icon: "Stats", color: "from-blue-600 to-indigo-700" },
          { title: "POS Integration Core", desc: "Offline-synchronization, thermal receipt printing, and barcode processing for retail environments.", icon: "Storefront", color: "from-slate-700 to-slate-900" }
        ],
        integrations: [
          { group: "Core Persistence", tags: ["PostgreSQL", "ACID Compliant", "Daily Snapshots"] },
          { group: "Logic Tier", tags: ["Next.js 14", "Node.js 20", "Row-Level Security"] },
          { group: "Integrations", tags: ["SMS Gateways", "Payment APIs", "Courier Webhooks"] },
          { group: "Hardware Support", tags: ["ESC/POS Printers", "Barcode Scanners", "Fingerprint Auth"] }
        ],
        pricing: [
          { t: "Startup Ops", p: "$1999", list: ["Core HRM & Accounting", "Single-Outlet POS Setup", "Standard Inventory Sync", "Role-Based Credentials", "1-Week Discovery Call"], color: "slate", highlight: false },
          { t: "Industrial Scaling", p: "$4499", list: ["Multi-Warehouse Logic", "Advanced CRM Pipeline", "Hardware API Protocols", "Automated PDF Audits", "6-Month Priority Support"], color: "teal", highlight: true },
          { t: "Global Enterprise", p: "Custom", list: ["Multi-Region Server Latency", "Custom Hardware Bridging", "Full System White-labeling", "Dedicated DevOps Support", "On-site Implementation"], color: "amber", highlight: false }
        ]
      },
      cta: { title: "Initialize SYICT Core." }
    },
    details: {
      hero: { badge: "Operation Technical Protocol", title: "Industrial Ecosystem", description: "We eliminate the fragmentation of standard SaaS. This manifest outlines the industrial-grade roadmap and hardware protocols." },
      sections: {
        phases: [
          { t: "Gap Analysis & Audit", d: "Deep audit of current spreadsheets and legacy silos to map required logic bridges.", icon: "Reader", step: "01" },
          { t: "Process Mapping (BPM)", d: "Architecting the bespoke workflows for HRM, CRM, and POS to ensure zero friction.", icon: "Settings", step: "02" },
          { t: "Engine Construction", d: "Development of the core logic with ACID-compliant persistence and real-time event bridges.", icon: "Code", step: "03" },
          { t: "Hardware Hardening", d: "Testing POS printers, scanners, and inventory handhelds against the core API protocols.", icon: "Chip", step: "04" },
          { t: "Data Migration Sprint", d: "Automated sanitization and migration of legacy organizational data into the new ecosystem.", icon: "Sync", step: "05" },
          { t: "Global Deployment", d: "Live system switch, staff training sessions, and 24/7 post-launch monitoring suite.", icon: "CloudUpload", step: "06" }
        ],
        manifest: [
          { label: "Execution Logic", value: "Next.js 14 / Node.js 20 (LTS)" },
          { label: "Data Integrity", value: "PostgreSQL with ACID Compliance" },
          { label: "Hardware Protocol", value: "ESC/POS / ZPL II / HID Scanners" },
          { label: "Communication Tier", value: "Twilio SMS / SendGrid / Custom Hooks" },
          { label: "Identity Layer", value: "Role-Based Access Control (RBAC) + JWT" },
          { label: "Archival Logic", value: "Daily Encrypted S3 Backups" }
        ],
        roi: [
          { title: "POS Bridging", desc: "Direct communication with receipt printers, scanners, and multi-region inventory hubs via atomic hardware drivers.", icon: "GitNetwork", support: "EPSON / SUNMI / ZEBRA" },
          { title: "Audit Transparency", desc: "Every transaction and payroll adjustment is logged with immutable audit trails to ensure fiscal accountability.", icon: "Shield", protocol: "RBAC / LOGGING / ACID" }
        ]
      },
      cta: { title: "Authorize Your Operation Brief." }
    }
  },
  {
    pageType: "branding",
    landing: {
      hero: {
        badge: "Visual Grammar Protocol",
        title: "Logo & Brand Identity",
        description: "We don't just design logos. We architect high-fidelity visual ecosystems that command authority, foster absolute trust, and ensure your identity is mathematically perfect.",
      },
      sections: {
        pillars: [
          { title: "Visual Geometry", desc: "We don't just 'draw' logos. We construct them using mathematical grids and the golden ratio for timeless balance.", icon: "Triangle", color: "from-indigo-600 to-blue-700" },
          { title: "Psychological Palettes", desc: "Selection of hex codes that trigger specific brand sentiments and emotional resonance in your target audience.", icon: "Palette", color: "from-purple-600 to-indigo-700" },
          { title: "Typographic Voice", desc: "Engineering primary and secondary typefaces that establish a clear hierarchy and establish your brand's authority.", icon: "Text", color: "from-slate-700 to-slate-900" }
        ],
        metrics: [
          { t: "Style Manual", d: "Usage & Exclusion zones" },
          { t: "Color Systems", d: "HEX, RGB & CMYK Scales" },
          { t: "Logic Grid", d: "Mathematical Construction" },
          { t: "Tone of Voice", d: "Copywriting Syntax" }
        ]
      },
      cta: { title: "Stop blending in. Initialize Iconography." }
    },
    details: {
      hero: { badge: "Visual Grammar Manifest", title: "Identity Architecture", description: "\"A brand is not a logo; it's a structural promise. We treat identity as a mathematical and psychological engineering discipline.\"" },
      sections: {
        phases: [
          { step: "01", stage: "Syntactic Research", action: "Analyzing market linguistics and defining the brand's unique semantic hooks." },
          { step: "02", stage: "Geometric Baseline", action: "Setting up mathematical grids and Fibonacci ratios for structural balance." },
          { step: "03", stage: "Core Construction", action: "Iterative sketching and vector refining of the primary mark." },
          { step: "04", stage: "Chromodynamic Mapping", action: "Synthesizing color palettes based on emotional delta and accessibility." },
          { step: "05", stage: "Voice & Tone Logic", action: "Engineering the copywriting syntax and communication manifest." },
          { step: "06", stage: "Governance Manual", action: "Documenting usage limits, spacing, and scaling protocols for global growth." }
        ],
        roi: [
           { group: "Visual Grammar", items: ["Grid-Based Logic", "Exclusion Zones", "Golden Ratio Scaling", "Adaptive Systems"] },
           { group: "Color Science", items: ["Emotion Mapping", "Delta-E Compliance", "WCAG AA Contrast", "Sub-Brand Palettes"] },
           { group: "Authority Tier", items: ["Corporate Tone Guide", "Typeface Licensing", "Iconography Logic", "Motion DNA"] }
        ],
        manifest: [
          { i: "Palette", t: "Delta-E Compliance", d: "Ensuring color consistency across all digital/print outputs." },
          { i: "Terminal", t: "HEX/RGB Logic", d: "Standardized code handoffs for digital implementation." },
          { i: "HardwareChip", t: "Print Precision", d: "Pantone & CMYK mapping for material assets." }
        ]
      },
      cta: { title: "Ready to activate your Distinctive Identity?" }
    }
  },
  {
    pageType: "ui-ux",
    landing: {
      hero: {
        badge: "Product Experience Blueprint",
        title: "UI/UX Design",
        description: "We don't just design interfaces; we architect user behavior. Our UI/UX philosophy is grounded in cognitive psychology and data-driven accessibility to ensure your product is beautiful and highly efficient.",
      },
      sections: {
        pillars: [
          { title: "User Research Protocol", desc: "Empathy mapping, user interviews, and data-driven personas to understand exactly who we are building for.", icon: "Search", color: "from-cyan-600 to-indigo-600" },
          { title: "Architectural Wireframing", desc: "Low-fidelity structural logic. We prioritize flow and information architecture before we touch a single pixel.", icon: "Layers", color: "from-indigo-600 to-blue-700" },
          { title: "Atomic Prototyping", desc: "High-fidelity, interactive Figma handoffs. Experience the final product before a single line of code is written.", icon: "Flash", color: "from-rose-500 to-pink-600" }
        ],
        metrics: [
          { t: "Atomic Design Specs" },
          { t: "Design Tokens (JSON)" },
          { t: "Figma Auto-Layout" },
          { t: "Interaction Prototypes" },
          { t: "Handoff Protocol" },
          { t: "Light/Dark Schemas" }
        ]
      },
      cta: { title: "Eliminate friction. Maximize Conversion." }
    },
    details: {
      hero: { badge: "Technical Specification Protocol", title: "Product Architecture", description: "Technical Specifications for UI/UX Protocol" },
      sections: {
         roi: [
          { title: "Cognitive Consistency", desc: "Predictable interaction patterns that reduce mental load.", icon: "Cube" },
          { title: "Atomic Scalability", desc: "Reusable component libraries for rapid production scaling.", icon: "Shield" }
         ]
      },
      cta: { title: "Ready to activate your Product Presence?" }
    }
  },
  {
    pageType: "social-creatives",
    landing: {
      hero: {
        badge: "Scroll-Stopping Architecture",
        title: "Social Media Creatives",
        description: "We stop the scroll with mathematical precision. Our creative assets are engineered to trigger engagement signals and build brand resonance through high-fidelity visual storytelling.",
      },
      sections: {
        pillars: [
          { title: "Viral Psychology", desc: "Designing visuals that stop the scroll through high-contrast hooks and psychological trigger mapping.", icon: "Images", color: "from-rose-500 to-pink-600" },
          { title: "Kinetic Content", desc: "High-density motion graphics and short-form video (Reels/TikTok) designed for maximum algorithmic retention.", icon: "Film", color: "from-pink-600 to-amber-600" },
          { title: "Brand Consistency", desc: "Engineering a unified visual language across all social touchpoints to build recognition and elite positioning.", icon: "Palette", color: "from-amber-500 to-rose-600" }
        ],
        metrics: [
          { t: "Short-form Content Sprints" },
          { t: "Carousel Storytelling" },
          { t: "Algorithmic Hook Mapping" },
          { t: "Viral Asset Auditing" },
          { t: "Cross-Platform Resizing" },
          { t: "Community Interaction Assets" }
        ]
      },
      cta: { title: "Stop being ignored. Command the Feed." }
    },
    details: {
      hero: { badge: "Technical Specification Protocol", title: "Creative Integrity", description: "Technical highlights of the social creative engine." },
      sections: {
         roi: [
          { title: "Algorithmic Optimization", desc: "Assets tested against social platforms' current ranking signals.", icon: "Flash" },
          { title: "Conversion Tracking", desc: "Attribution of creative performance to bottom-line ROI.", icon: "Stats" }
         ]
      },
      cta: { title: "Ready to activate your Social Engine?" }
    }
  },
  {
    pageType: "facebook-ads",
    landing: {
      hero: {
        badge: "Performance Growth Engine",
        title: "Facebook Ads Management",
        description: "We treat ad spend as a technical investment. Our Facebook Ads infrastructure is built on deep behavioral data and creative engineering to ensure your ROAS is both high and predictable.",
      },
      sections: {
        pillars: [
          { title: "Precision Targeting", desc: "Leveraging custom audiences, lookalikes, and behavioral interest mapping to ensure your budget hit the exact buyer persona.", icon: "People", color: "from-emerald-600 to-green-700" },
          { title: "Conversion Funnels", desc: "Architecting multi-stage customer journeys from cold awareness to high-intent remarketing cycles.", icon: "Filter", color: "from-green-700 to-blue-800" },
          { title: "ROAS Optimization", desc: "Rigorous daily tracking of Return on Ad Spend (ROAS) and attribution modeling to maximize every dollar spent.", icon: "BarChart", color: "from-blue-600 to-emerald-700" }
        ],
        metrics: [
          { t: "Custom conversion setups" },
          { t: "Pixel & API Integration" },
          { t: "ROAS Attribution Logic" },
          { t: "LTV Forecasting" },
          { t: "A/B Creative Sprints" },
          { t: "Competitor Scale Audit" }
        ]
      },
      cta: { title: "Stop burning budget. Command the Feed." }
    },
    details: {
      hero: { badge: "Technical Specification Protocol", title: "Ads Performance Audit", description: "Technical manifest of our ads engine." },
      sections: {
         roi: [
          { title: "Multi-Region Scaling", desc: "Dynamic budget allocation across global markets.", icon: "Globe" },
          { title: "Creative Integrity", desc: "Automated monitoring of ad fatigue and conversion shifts.", icon: "Shield" }
         ]
      },
      cta: { title: "Ready to activate your Growth Brief?" }
    }
  },
  {
    pageType: "seo",
    landing: {
      hero: {
        badge: "Structural Authority Architecture",
        title: "SEO Optimization",
        description: "We stop the scroll and dominate the search. Our SEO strategies are built on deep technical audits and semantic entity mapping that turn search intent into high-fidelity revenue.",
      },
      sections: {
        pillars: [
          { title: "Structural Authority", desc: "Optimizing your site's hierarchy and Core Web Vitals to ensure search engines can index your value with zero friction.", icon: "GitNetwork", color: "from-indigo-600 to-slate-700" },
          { title: "Semantic Mapping", desc: "Moving beyond keywords into entity-based SEO. We map your content to the underlying intent of your target audience.", icon: "Search", color: "from-slate-700 to-indigo-800" },
          { title: "Growth Analytics", desc: "Real-time tracking of rank velocity, conversion attribution, and competitor movement to adjust strategy on the fly.", icon: "BarChart", color: "from-indigo-500 to-sky-600" }
        ],
        metrics: [
          { t: "Core Web Vitals Audit" },
          { t: "Semantic Entity Mapping" },
          { t: "JavaScript SEO Handoff" },
          { t: "Internal Link Logic" },
          { t: "Competitor Velocity Gap" },
          { t: "Backlink Integrity" }
        ]
      },
      cta: { title: "Stop playing catch up. Command the First Page." }
    },
    details: {
      hero: { badge: "Technical Specification Protocol", title: "SEO Architecture Audit", description: "Technical manifest of our SEO engine." },
      sections: {
         roi: [
          { title: "Visibility Resilience", desc: "Algorithm-proof content clusters and entity associations.", icon: "Infinite" },
          { title: "Authority Scoring", desc: "Deep metrics on backlink power and structural dominance.", icon: "TrendingUp" }
         ]
      },
      cta: { title: "Ready to initialize your Visibility Brief?" }
    }
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for seeding...");
  
  for (const item of seedData) {
    await WebServiceContent.findOneAndUpdate(
      { pageType: item.pageType },
      item,
      { upsert: true, new: true, runValidators: false } // Relax validators for seeding mixed types
    );
    console.log(`Seeded: ${item.pageType}`);
  }
  
  process.exit();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
