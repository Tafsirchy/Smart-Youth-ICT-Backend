const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const CompanyCertification = require("../src/models/CompanyCertification");

const CERTIFICATIONS = [
  {
    title: "Professional Full-Stack Web Engineering Certification",
    courseName: "Full-Stack Web Engineering",
    issuer: "Smart Youth ICT Academy • ISO 9001:2015 Audited",
    category: "Web & Software",
    credentialId: "SYICT-FSW-2026-CERT",
    duration: "6 Months (240+ Hours Practical Lab)",
    issueDate: "Upon Course Completion & Project Defense",
    expiryDate: "Lifetime Professional Credential",
    description:
      "Awarded to graduates who demonstrate end-to-end full-stack mastery, architecting modern React/Next.js frontend systems, scalable Node.js microservices, and database models.",
    image: "/images/certificate-placeholder.png",
    verificationUrl: "https://www.smartyouthict.com/verify",
    skills: ["React & Next.js 15", "Node.js & Express API", "MongoDB & PostgreSQL", "Docker & Cloud Deploy"],
    highlights: [
      "Industry-Grade Capstone Defense",
      "Encrypted QR-Verifiable Credential ID",
      "Direct Tech Employer Referral Network",
    ],
    order: 0,
    isActive: true,
    isFeatured: true,
  },
  {
    title: "UI/UX & Product Design Professional Certification",
    courseName: "UI/UX & Product Design",
    issuer: "Smart Youth ICT Academy • Design System Lab",
    category: "Design & Product",
    credentialId: "SYICT-UXD-2026-CERT",
    duration: "4 Months (160+ Hours Studio Work)",
    issueDate: "Upon Course Completion & Portfolio Review",
    expiryDate: "Lifetime Professional Credential",
    description:
      "Certifies advanced competency in user-centered digital product architecture, atomic design token libraries, wireframing, heuristic accessibility, and interactive Figma prototyping.",
    image: "", // Demonstrates automatic mock certificate when image is not uploaded yet
    verificationUrl: "https://www.smartyouthict.com/verify",
    skills: ["Figma Design Systems", "User Research & Testing", "Wireframing & Prototyping", "Design Tokens"],
    highlights: [
      "End-to-End Product Case Study",
      "Atomic Token Systems Vetted",
      "International Design Portfolio Standards",
    ],
    order: 1,
    isActive: true,
    isFeatured: true,
  },
  {
    title: "Digital Marketing & Performance Ads Specialist Certification",
    courseName: "Digital Marketing Masterclass",
    issuer: "Smart Youth ICT Academy • Growth & Performance Lab",
    category: "Marketing & Growth",
    credentialId: "SYICT-MKT-2026-CERT",
    duration: "4 Months (160+ Hours Live Campaigns)",
    issueDate: "Upon Course Completion & Campaign Audit",
    expiryDate: "Lifetime Professional Credential",
    description:
      "Validates practical execution of paid Meta ads, server-side Conversions API (CAPI), Google search/display campaigns, and multi-stage behavioral conversion funnels.",
    image: "",
    verificationUrl: "https://www.smartyouthict.com/verify",
    skills: ["Meta Ads & CAPI Setup", "Google Ads & PPC", "Technical SEO Audits", "Data Attribution & ROAS"],
    highlights: [
      "Live Ad Budget Optimization",
      "Server-Side Tracking Architecture",
      "High-ROAS Ecommerce Funnel Design",
    ],
    order: 2,
    isActive: true,
    isFeatured: false,
  },
  {
    title: "Python & Applied AI Engineering Certification",
    courseName: "Python & Applied AI",
    issuer: "Smart Youth ICT Academy • AI Research Hub",
    category: "Artificial Intelligence",
    credentialId: "SYICT-AI-2026-CERT",
    duration: "6 Months (240+ Hours Machine Learning Lab)",
    issueDate: "Upon Course Completion & Model Evaluation",
    expiryDate: "Lifetime Professional Credential",
    description:
      "Confirms mathematical and programming proficiency in Python, machine learning workflows, RAG pipelines, autonomous agent architectures, and LLM fine-tuning.",
    image: "",
    verificationUrl: "https://www.smartyouthict.com/verify",
    skills: ["Python 3 Advanced", "Scikit-Learn & ML", "RAG & Vector Databases", "Autonomous AI Agents"],
    highlights: [
      "Production Agent Pipeline Deployment",
      "Mathematical Modeling Defense",
      "Generative AI Workflow Integration",
    ],
    order: 3,
    isActive: true,
    isFeatured: true,
  },
  {
    title: "Cross-Platform App Development (Flutter) Certification",
    courseName: "App Development (Flutter)",
    issuer: "Smart Youth ICT Academy • Mobile Engineering Lab",
    category: "Mobile Development",
    credentialId: "SYICT-MOB-2026-CERT",
    duration: "5 Months (200+ Hours Mobile Dev)",
    issueDate: "Upon Course Completion & App Launch",
    expiryDate: "Lifetime Professional Credential",
    description:
      "Certifies end-to-end mobile app engineering capability across Android and iOS platforms using Flutter, Dart, state management patterns, and cloud API integration.",
    image: "",
    verificationUrl: "https://www.smartyouthict.com/verify",
    skills: ["Flutter & Dart", "BLoC State Management", "Firebase Backend", "App Store Publishing"],
    highlights: [
      "Dual iOS & Android App Release",
      "Hardware API Integration",
      "App Store Optimization (ASO)",
    ],
    order: 4,
    isActive: true,
    isFeatured: false,
  },
  {
    title: "Cyber Security & Ethical Hacking Certification",
    courseName: "Cyber Security & Ethical Hacking",
    issuer: "Smart Youth ICT Academy • National Tech Standards",
    category: "Cyber Security",
    credentialId: "SYICT-SEC-2026-CERT",
    duration: "6 Months (240+ Hours Defense Labs)",
    issueDate: "Upon Course Completion & CTF Challenge",
    expiryDate: "Lifetime Professional Credential",
    description:
      "Confirms hands-on defense engineering, web application penetration testing, OWASP mitigation, network sniffing triage, and ethical exploitation reporting.",
    image: "",
    verificationUrl: "https://www.smartyouthict.com/verify",
    skills: ["Network Pen-Testing", "OWASP Top 10 Hardening", "Linux Kernel Security", "Digital Forensics & SOC"],
    highlights: [
      "Live Sandboxed CTF Defense",
      "Vulnerability Audit Reports",
      "ISO 27001 Protocol Guidelines",
    ],
    order: 5,
    isActive: true,
    isFeatured: false,
  },
  {
    title: "Graphic Design & Strategic Brand Identity Certification",
    courseName: "Graphic Design & Branding",
    issuer: "Smart Youth ICT Academy • Creative Studio",
    category: "Design & Creative",
    credentialId: "SYICT-DSN-2026-CERT",
    duration: "4 Months (160+ Hours Studio Work)",
    issueDate: "Upon Course Completion & Brand Guidelines Defense",
    expiryDate: "Lifetime Professional Credential",
    description:
      "Validates complete technical mastery of vector branding, Photoshop composite art, typography systems, packaging print preparation, and commercial stylebooks.",
    image: "",
    verificationUrl: "https://www.smartyouthict.com/verify",
    skills: ["Photoshop Composite Art", "Illustrator Vector Systems", "Brand Identity Guidelines", "Commercial Print Prep"],
    highlights: [
      "Complete Brand Identity Portfolio",
      "Packaging Design Case Study",
      "Global Agency-Ready Standards",
    ],
    order: 6,
    isActive: true,
    isFeatured: false,
  },
  {
    title: "Data Science & Business Analytics Certification",
    courseName: "Data Science & Analytics",
    issuer: "Smart Youth ICT Academy • Analytics Center",
    category: "Data & AI",
    credentialId: "SYICT-DSA-2026-CERT",
    duration: "5 Months (200+ Hours Analytics)",
    issueDate: "Upon Course Completion & Business Dashboard Review",
    expiryDate: "Lifetime Professional Credential",
    description:
      "Certifies analytical capability in enterprise data transformation, SQL relational architecture, Power BI storytelling, predictive metrics, and executive insight delivery.",
    image: "",
    verificationUrl: "https://www.smartyouthict.com/verify",
    skills: ["Python Data Wrangling", "SQL & Data Warehousing", "Power BI Dashboards", "Statistical Modeling"],
    highlights: [
      "Executive Dashboard Case Study",
      "Predictive Data Pipelines",
      "Commercial Decision Storytelling",
    ],
    order: 7,
    isActive: true,
    isFeatured: false,
  },
];

async function seedCompanyCertifications() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("MONGO_URI is missing in .env");
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    console.log("Resetting/upserting certified course certificates...");
    await CompanyCertification.deleteMany({});

    const inserted = await CompanyCertification.insertMany(CERTIFICATIONS);
    console.log(`Successfully seeded ${inserted.length} certified course certificates.`);

    inserted.forEach((item, idx) => {
      console.log(`[${idx + 1}] ${item.title} -> ${item.courseName} (${item.category})`);
    });

    await mongoose.disconnect();
    console.log("MongoDB connection closed. Seed complete.");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seedCompanyCertifications();
