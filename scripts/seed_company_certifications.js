const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const CompanyCertification = require("../src/models/CompanyCertification");

const CERTIFICATIONS = [
  {
    title: "ISO 9001:2015 Quality Management System",
    issuer: "International Organization for Standardization (ISO)",
    category: "ISO Quality Standard",
    credentialId: "ISO-9001:2015-SYICT-BD",
    issueDate: "2023-03-15",
    expiryDate: "2026-03-14",
    description:
      "Internationally recognized standard ensuring our educational services, technological infrastructure, and student mentorship satisfy rigorous quality management benchmarks.",
    image: "/images/certificate-placeholder.png",
    verificationUrl: "https://www.iso.org/standard/62085.html",
    highlights: [
      "Standardized Curriculum Framework",
      "Rigorous Independent Annual Audit",
      "Global Credential Recognition",
    ],
    order: 0,
    isActive: true,
    isFeatured: true,
  },
  {
    title: "Government Registered Technical Institute",
    issuer: "Bangladesh Technical Education Board (BTEB) & Ministry of Education",
    category: "Government Accreditation",
    credentialId: "BTEB-INST-REG-78921",
    issueDate: "2022-07-01",
    expiryDate: "Permanent Active Authorization",
    description:
      "Fully licensed institutional training facility under the technical education board, ensuring valid compliance with national skill qualification frameworks.",
    image:
      "https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&w=1200&q=80",
    verificationUrl: "http://www.bteb.gov.bd",
    highlights: [
      "Government Verified Certification",
      "BTEB Curriculum Compliance",
      "Authorized Examination Venue",
    ],
    order: 1,
    isActive: true,
    isFeatured: true,
  },
  {
    title: "Recognized Digital Sandbox & ICT Contributor",
    issuer: "National ICT Division & Regional IT Industry Associations",
    category: "Industry Validation",
    credentialId: "ICT-DIV-ACC-2023-441",
    issueDate: "2023-11-20",
    expiryDate: "Renewed Annually",
    description:
      "Awarded validation by apex regional IT associations for continuous and relentless contribution to youth upskilling and the national software freelance economy.",
    image:
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80",
    verificationUrl: "https://ictd.gov.bd",
    highlights: [
      "Digital Bangladesh Skill Contributor",
      "Youth Freelancing Accelerator",
      "Industry-Standard Lab Facilities",
    ],
    order: 2,
    isActive: true,
    isFeatured: false,
  },
  {
    title: "BASIS Affiliated Member & IT Partner",
    issuer: "Bangladesh Association of Software and Information Services (BASIS)",
    category: "Industry Affiliation",
    credentialId: "BASIS-MEM-2024-SYICT",
    issueDate: "2024-01-10",
    expiryDate: "Valid through 2027",
    description:
      "Affiliated member within Bangladesh's apex software and IT services association, ensuring software engineering and marketing syllabus aligns with corporate employer expectations.",
    image: "/images/certificate-placeholder.png",
    verificationUrl: "https://basis.org.bd",
    highlights: [
      "Corporate Recruitment Linkage",
      "Industry-Vetted Course Content",
      "Direct Internship Pathways",
    ],
    order: 3,
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

    const existingCount = await CompanyCertification.countDocuments();
    console.log(`Found ${existingCount} existing company certifications.`);

    if (existingCount > 0) {
      console.log("Resetting/upserting seed company certifications...");
      await CompanyCertification.deleteMany({});
    }

    const inserted = await CompanyCertification.insertMany(CERTIFICATIONS);
    console.log(`Successfully seeded ${inserted.length} company certifications.`);

    inserted.forEach((item, idx) => {
      console.log(`[${idx + 1}] ${item.title} (${item.issuer}) - ${item.category}`);
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
