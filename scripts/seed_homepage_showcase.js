const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const HomeERP = require('../src/models/HomeERP');
const HomeTechStack = require('../src/models/HomeTechStack');

const erpSeedData = [
  {
    title: "POS System",
    category: "Retail & Counter Billing",
    description: "Barcode scanning, thermal receipts, cash drawer & real-time register audit.",
    icon: "Receipt",
    tag: "High Velocity",
    badgeColor: "emerald",
    demoUrl: "/contact?service=erp-pos",
    order: 1,
    isActive: true
  },
  {
    title: "CRM System",
    category: "Sales & Client Pipeline",
    description: "Automated lead tracking, deal pipelines, customer 360 & communication log.",
    icon: "Users",
    tag: "Conversion",
    badgeColor: "blue",
    demoUrl: "/contact?service=erp-crm",
    order: 2,
    isActive: true
  },
  {
    title: "HR-Payroll & Accounts",
    category: "Workforce & Financial Ledger",
    description: "Biometric attendance, auto payroll deductions, provident fund & general ledger.",
    icon: "BadgeCheck",
    tag: "Corporate",
    badgeColor: "indigo",
    demoUrl: "/contact?service=erp-hr",
    order: 3,
    isActive: true
  },
  {
    title: "Stock Inventory & POS",
    category: "Warehouse & Supply Chain",
    description: "Multi-branch warehouse stock sync, low-stock triggers, batch & expiry control.",
    icon: "Package",
    tag: "Multi-Warehouse",
    badgeColor: "teal",
    demoUrl: "/contact?service=erp-inventory",
    order: 4,
    isActive: true
  },
  {
    title: "Billing & Invoice Management",
    category: "Automated Fiscal SaaS",
    description: "Multi-currency invoicing, automated payment gateway collections & VAT reports.",
    icon: "CreditCard",
    tag: "Automated",
    badgeColor: "emerald",
    demoUrl: "/contact?service=erp-billing",
    order: 5,
    isActive: true
  },
  {
    title: "Order Management System",
    category: "E-Commerce Fulfillment",
    description: "Centralized order dispatch, multi-courier API bridge & delivery tracking.",
    icon: "ShoppingCart",
    tag: "Fulfillment",
    badgeColor: "amber",
    demoUrl: "/contact?service=erp-order",
    order: 6,
    isActive: true
  },
  {
    title: "Doctor Appointment System",
    category: "Healthcare & Chamber",
    description: "Doctor schedules, real-time chamber booking, e-prescriptions & patient history.",
    icon: "Activity",
    tag: "Medical Suite",
    badgeColor: "cyan",
    demoUrl: "/contact?service=erp-doctor",
    order: 7,
    isActive: true
  },
  {
    title: "CRM & Project Management",
    category: "Agency Operations",
    description: "Kanban sprint boards, milestone tracking, timesheets & client shared portal.",
    icon: "Briefcase",
    tag: "Agile Ready",
    badgeColor: "violet",
    demoUrl: "/contact?service=erp-pm",
    order: 8,
    isActive: true
  },
  {
    title: "Token & Queue Management",
    category: "Smart Footfall Routing",
    description: "Digital counter TV display, multi-service ticketing & SMS queue alerts.",
    icon: "Clock",
    tag: "Zero Wait",
    badgeColor: "rose",
    demoUrl: "/contact?service=erp-queue",
    order: 9,
    isActive: true
  },
  {
    title: "Restaurant & Food Management",
    category: "Hospitality & Dining",
    description: "Kitchen Display System (KDS), table QR order, recipe inventory & takeaway billing.",
    icon: "Coffee",
    tag: "Food & Bar",
    badgeColor: "orange",
    demoUrl: "/contact?service=erp-restaurant",
    order: 10,
    isActive: true
  },
  {
    title: "NGO Management System",
    category: "Non-Profit & Grants",
    description: "Donor relationship tracking, microcredit grants, field audit & compliance logs.",
    icon: "Heart",
    tag: "Social Impact",
    badgeColor: "emerald",
    demoUrl: "/contact?service=erp-ngo",
    order: 11,
    isActive: true
  },
  {
    title: "Co-operative Loan Management",
    category: "Microfinance & Credit",
    description: "Member savings ledger, installment schedule calculator, penalty & profit sharing.",
    icon: "Shield",
    tag: "Banking Grade",
    badgeColor: "blue",
    demoUrl: "/contact?service=erp-loan",
    order: 12,
    isActive: true
  },
  {
    title: "Clinic & Hospital Management",
    category: "Full Hospital Operations",
    description: "IPD/OPD admissions, lab diagnostic test integration, bed allocation & pharmacy billing.",
    icon: "Cross",
    tag: "Complete ERP",
    badgeColor: "red",
    demoUrl: "/contact?service=erp-hospital",
    order: 13,
    isActive: true
  }
];

const techSeedData = [
  // Languages
  { name: "Python", category: "language", badge: "AI / Data", icon: "devicon-python-plain", color: "#3776AB", order: 1, isActive: true },
  { name: "JavaScript", category: "language", badge: "Universal", icon: "devicon-javascript-plain", color: "#F7DF1E", order: 2, isActive: true },
  { name: "TypeScript", category: "language", badge: "Type-Safe", icon: "devicon-typescript-plain", color: "#3178C6", order: 3, isActive: true },
  { name: "PHP", category: "language", badge: "Web Engine", icon: "devicon-php-plain", color: "#777BB4", order: 4, isActive: true },
  { name: "Go", category: "language", badge: "Cloud Microservices", icon: "devicon-go-original-wordmark", color: "#00ADD8", order: 5, isActive: true },
  { name: "Rust", category: "language", badge: "Systems / WASM", icon: "devicon-rust-plain", color: "#DEA584", order: 6, isActive: true },
  { name: "Java", category: "language", badge: "Enterprise JVM", icon: "devicon-java-plain", color: "#ED8B00", order: 7, isActive: true },
  { name: "C++", category: "language", badge: "Ultra Fast", icon: "devicon-cplusplus-plain", color: "#00599C", order: 8, isActive: true },
  { name: "C#", category: "language", badge: ".NET Core", icon: "devicon-csharp-plain", color: "#239120", order: 9, isActive: true },
  { name: "Kotlin", category: "language", badge: "Android Native", icon: "devicon-kotlin-plain", color: "#7F52FF", order: 10, isActive: true },
  { name: "Swift", category: "language", badge: "iOS Native", icon: "devicon-swift-plain", color: "#F05138", order: 11, isActive: true },
  { name: "Dart", category: "language", badge: "Mobile UI", icon: "devicon-dart-plain", color: "#0175C2", order: 12, isActive: true },

  // Markup & Styles
  { name: "HTML5", category: "markup", badge: "Semantic Web", icon: "devicon-html5-plain", color: "#E34F26", order: 13, isActive: true },
  { name: "CSS3", category: "markup", badge: "Styling Core", icon: "devicon-css3-plain", color: "#1572B6", order: 14, isActive: true },
  { name: "Tailwind CSS", category: "markup", badge: "Design Tokens", icon: "devicon-tailwindcss-plain", color: "#06B6D4", order: 15, isActive: true },
  { name: "Sass/SCSS", category: "markup", badge: "CSS Preprocessor", icon: "devicon-sass-original", color: "#CC6699", order: 16, isActive: true },

  // Frameworks & Libraries
  { name: "React", category: "framework", badge: "Reactive UI", icon: "devicon-react-original", color: "#61DAFB", order: 17, isActive: true },
  { name: "Next.js", category: "framework", badge: "SSR & Edge", icon: "devicon-nextjs-plain", color: "#000000", order: 18, isActive: true },
  { name: "Node.js", category: "framework", badge: "Runtime Engine", icon: "devicon-nodejs-plain", color: "#339933", order: 19, isActive: true },
  { name: "Express", category: "framework", badge: "Micro-APIs", icon: "devicon-express-original", color: "#444444", order: 20, isActive: true },
  { name: "Django", category: "framework", badge: "Python Web", icon: "devicon-django-plain", color: "#092E20", order: 21, isActive: true },
  { name: "FastAPI", category: "framework", badge: "High-Perf API", icon: "devicon-fastapi-plain", color: "#009688", order: 22, isActive: true },
  { name: "Laravel", category: "framework", badge: "PHP Ecosystem", icon: "devicon-laravel-plain", color: "#FF2D20", order: 23, isActive: true },
  { name: "Spring Boot", category: "framework", badge: "Java Microservices", icon: "devicon-spring-plain", color: "#6DB33F", order: 24, isActive: true },
  { name: "React Native", category: "framework", badge: "Cross Mobile", icon: "devicon-react-original", color: "#61DAFB", order: 25, isActive: true },
  { name: "Flutter", category: "framework", badge: "Multi-Platform", icon: "devicon-flutter-plain", color: "#02569B", order: 26, isActive: true },

  // Databases & Cloud
  { name: "PostgreSQL", category: "database", badge: "ACID Relational", icon: "devicon-postgresql-plain", color: "#4169E1", order: 27, isActive: true },
  { name: "MongoDB", category: "database", badge: "NoSQL JSON", icon: "devicon-mongodb-plain", color: "#47A248", order: 28, isActive: true },
  { name: "Redis", category: "database", badge: "In-Memory Speed", icon: "devicon-redis-plain", color: "#DC382D", order: 29, isActive: true },
  { name: "Docker", category: "devops_cloud", badge: "Containers", icon: "devicon-docker-plain", color: "#2496ED", order: 30, isActive: true },
  { name: "Kubernetes", category: "devops_cloud", badge: "Cluster K8s", icon: "devicon-kubernetes-plain", color: "#326CE5", order: 31, isActive: true },
  { name: "AWS", category: "devops_cloud", badge: "Cloud Platform", icon: "devicon-amazonwebservices-original", color: "#FF9900", order: 32, isActive: true },
  { name: "Cloudflare", category: "devops_cloud", badge: "Edge CDN & DDoS", icon: "devicon-cloudflare-plain", color: "#F38020", order: 33, isActive: true }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  console.log('Connected to MongoDB');

  // Seed ERP
  await HomeERP.deleteMany({});
  const erpDocs = await HomeERP.insertMany(erpSeedData);
  console.log(`Seeded ${erpDocs.length} ERP software systems.`);

  // Seed Tech Stack
  await HomeTechStack.deleteMany({});
  const techDocs = await HomeTechStack.insertMany(techSeedData);
  console.log(`Seeded ${techDocs.length} Technologies & Languages.`);

  await mongoose.disconnect();
  console.log('Disconnected cleanly.');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
