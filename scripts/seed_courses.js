const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const Course = require("../src/models/Course");
const User = require("../src/models/User");
const slugify = require("slugify");

const PROGRAMS = [
  {
    title: "Full-Stack Web Engineering",
    category: "web-dev",
    description:
      "From HTML to advanced cloud deployments. Master the complete MERN stack (MongoDB, Express, React, Node.js) alongside Next.js and Tailwind.",
    tech: ["React", "Next.js", "Node", "MongoDB", "AWS"],
    price: 8500,
    originalPrice: 15000,
    duration: "6 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=800&fit=crop",
  },
  {
    title: "UI/UX & Product Design",
    category: "graphic-design",
    description:
      "Master the psychology of user interfaces. Learn wireframing, high-fidelity prototyping, and complex design systems using Figma.",
    tech: ["Figma", "Prototyping", "Wireframes", "User Research"],
    price: 6000,
    originalPrice: 10000,
    duration: "4 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=800&fit=crop",
  },
  {
    title: "Digital Marketing Masterclass",
    category: "smm",
    description:
      "Learn to run profitable campaigns across Meta, Google, and TikTok. Master technical SEO, copywriting, and data-driven marketing decisions.",
    tech: ["Meta Ads", "Google Ads", "SEO", "Analytics"],
    price: 5500,
    originalPrice: 9000,
    duration: "3 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=1200&h=800&fit=crop",
  },
  {
    title: "Python & Applied AI",
    category: "ai",
    description:
      "Learn Python from scratch and move into data science and machine learning. Build AI wrappers and automate workflows using OpenAI APIs.",
    tech: ["Python", "Pandas", "Scikit", "OpenAI API"],
    price: 7000,
    originalPrice: 12000,
    duration: "2 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=800&fit=crop",
  },
  {
    title: "App Development (Flutter)",
    category: "web-dev",
    description:
      "Build natively compiled applications for mobile, web, and desktop from a single codebase using Google's UI toolkit.",
    tech: ["Dart", "Flutter", "Firebase", "State Mgmt"],
    price: 7200,
    originalPrice: 11000,
    duration: "5 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&h=800&fit=crop",
  },
  {
    title: "Video Editing & Animation",
    category: "other",
    description:
      "Master Premiere Pro and After Effects. Learn the art of storytelling through motion, color grading, and dynamic transitions.",
    tech: ["Premiere Pro", "After Effects", "DaVinci", "Coloring"],
    price: 5200,
    originalPrice: 8000,
    duration: "4 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=1200&h=800&fit=crop",
  },
  {
    title: "Cyber Security & Ethical Hacking",
    category: "other",
    description:
      "Learn to identify vulnerabilities, perform penetration testing, and secure network infrastructures against modern digital threats.",
    tech: ["Kali Linux", "Metasploit", "Nmap", "Wireshark"],
    price: 12000,
    originalPrice: 18000,
    duration: "6 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=800&fit=crop",
  },
  {
    title: "Data Science & Analytics",
    category: "ai",
    description:
      "Master the art of data storytelling. Learn to clean, analyze, and visualize complex datasets to drive business decisions.",
    tech: ["Tableau", "SQL", "Power BI", "Statistics"],
    price: 7800,
    originalPrice: 12500,
    duration: "5 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop",
  },
  {
    title: "Cloud Computing & DevOps",
    category: "web-dev",
    description:
      "Learn to deploy and manage scalable infrastructure on AWS and Azure. Master CI/CD pipelines, Docker, and Kubernetes.",
    tech: ["AWS", "Azure", "Docker", "Kubernetes"],
    price: 9800,
    originalPrice: 14500,
    duration: "6 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=800&fit=crop",
  },
  {
    title: "Software Quality Assurance",
    category: "other",
    description:
      "Learn manual and automated testing. Master bug tracking, test cases, and quality control for enterprise-level software.",
    tech: ["Selenium", "Jira", "Postman", "Cypress"],
    price: 4800,
    originalPrice: 7600,
    duration: "3 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=800&fit=crop",
  },
  {
    title: "Game Development (Unity)",
    category: "other",
    description:
      "Learn to build immersive 2D and 3D games for mobile and PC. Master C#, Unity Engine, and game physics from scratch.",
    tech: ["Unity 3D", "C#", "Level Design", "Blender"],
    price: 9000,
    originalPrice: 14000,
    duration: "6 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&h=800&fit=crop",
  },
  {
    title: "Content Writing & Copywriting",
    category: "smm",
    description:
      "Master the art of persuasive writing. Learn to create viral blogs, high-converting ad copies, and technical documentation.",
    tech: ["SEO Writing", "Copywriting", "Ghostwriting", "Storytelling"],
    price: 4200,
    originalPrice: 6500,
    duration: "3 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&h=800&fit=crop",
  },
  {
    title: "Graphic Design & Branding",
    category: "graphic-design",
    description:
      "Master Adobe Photoshop and Illustrator. Learn the principles of composition, color theory, and typography to create world-class brand identities.",
    tech: ["Photoshop", "Illustrator", "InDesign", "Logo Design"],
    price: 6000,
    originalPrice: 9800,
    duration: "4 Months",
    thumbnail:
      "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200&h=800&fit=crop",
  },
];

const COURSES = PROGRAMS.map((program, idx) => ({
  title: { en: program.title, bn: program.title },
  slug: slugify(program.title, { lower: true, strict: true }),
  isMaster: true,
  description: { en: program.description, bn: program.description },
  tagline: `${program.title} career track`,
  outcomes: [
    `Build portfolio projects in ${program.title}.`,
    `Develop job-ready practical skills.`,
  ],
  targetAudience: ["Students", "Freelancers", "Job Seekers"],
  language: "Bengali / English",
  mode: "Online Live & Recorded",
  category: program.category,
  thumbnail: program.thumbnail,
  price: program.price,
  originalPrice: program.originalPrice,
  duration: program.duration,
  isPublished: true,
  isPopular: idx < 4,
  features: [
    {
      iconKey: "FaBolt",
      text: `${program.tech.slice(0, 2).join(" + ")} focused modules`,
    },
  ],
  projects: [
    {
      title: `${program.title} Capstone Project`,
      desc: `Hands-on real-world capstone in ${program.title}.`,
      techs: program.tech,
      image: program.thumbnail,
    },
  ],
  faqs: [
    {
      question: "Is this beginner friendly?",
      answer:
        "Yes. The course starts from foundational concepts and advances step-by-step.",
    },
  ],
  curriculum: [
    {
      title: "Module 1: Foundations",
      duration: "8h 0m",
      isFree: true,
      topics: program.tech.slice(0, 3),
    },
  ],
}));

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Find an admin user to own the courses
    const admin = await User.findOne({
      role: { $in: ["admin", "super_admin"] },
    });
    if (!admin) {
      console.log("No admin found to attach courses to. Seeding aborted.");
      process.exit(1);
    }

    console.log("Removing old mock courses...");
    await Course.deleteMany({}); // Start completely clean to avoid duplicates

    console.log("Injecting core training program courses...");
    const coursesToInsert = COURSES.map((c) => ({
      ...c,
      instructor: admin._id,
      branchId: admin.branchId || null,
    }));

    await Course.insertMany(coursesToInsert);
    console.log(
      "Success! Populated " + coursesToInsert.length + " core program courses!",
    );

    process.exit(0);
  } catch (err) {
    console.error("Seeding courses failed:", err);
    process.exit(1);
  }
}

seed();
