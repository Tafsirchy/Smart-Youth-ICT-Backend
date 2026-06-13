const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const Project = require("../src/models/Project");
const User = require("../src/models/User");

const PROJECTS = [
  {
    title: 'Full-Stack E-commerce Website Development',
    category: 'Web Development',
    budget: 850,
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    description: 'Looking for a skilled MERN stack developer to build a modern e-commerce platform with Stripe integration, product variations, and administrative dashboard.',
    requirements: ['React', 'Node.js', 'MongoDB', 'Stripe Integration'],
    status: 'open'
  },
  {
    title: 'Social Media Management & Content Creation',
    category: 'Digital Marketing',
    budget: 350,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    description: 'Need a creative marketer to manage 3 social platforms, create weekly graphics, and run targeted ad campaigns to increase local foot traffic.',
    requirements: ['Social Media Copywriting', 'Graphic Design (Canva/Figma)', 'Ad Campaign Setup'],
    status: 'open'
  },
  {
    title: 'Brand Identity & Logo Design',
    category: 'Graphic Design',
    budget: 200,
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
    description: 'We need a complete brand identity revamp including a minimalist logo, color palette, typography guidelines, and business card designs.',
    requirements: ['Logo Design', 'Brand Guidelines', 'Adobe Illustrator'],
    status: 'open'
  },
  {
    title: 'SEO Audit & Optimization',
    category: 'SEO',
    budget: 400,
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
    description: 'Comprehensive technical SEO audit, keyword research, and on-page optimization for a B2B corporate website targeting global clients.',
    requirements: ['Technical SEO', 'Keyword Research', 'Google Search Console'],
    status: 'open'
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Find any user (preferably admin or super_admin, but fallback to any user)
    let clientUser = await User.findOne({
      role: { $in: ["admin", "super_admin", "branch_admin", "instructor"] },
    });
    if (!clientUser) {
      clientUser = await User.findOne({});
    }

    if (!clientUser) {
      console.log("No user found in database. Please seed users first.");
      process.exit(1);
    }

    console.log(`Using user "${clientUser.name}" (${clientUser.email}) as the client.`);

    console.log("Removing old projects...");
    await Project.deleteMany({});

    console.log("Seeding new projects...");
    const projectsToInsert = PROJECTS.map((p) => ({
      ...p,
      client: clientUser._id,
    }));

    await Project.insertMany(projectsToInsert);
    console.log(`Success! Populated ${projectsToInsert.length} projects!`);
    process.exit(0);
  } catch (err) {
    console.error("Seeding projects failed:", err);
    process.exit(1);
  }
}

seed();
