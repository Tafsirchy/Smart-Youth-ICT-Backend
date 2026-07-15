require("dotenv").config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require("mongoose");
const User = require("./src/models/User");
const Branch = require("./src/models/Branch");
const bcrypt = require("bcryptjs");

async function seedInstructors() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/syict";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for seeding...");

    const branch = await Branch.findOne();
    const branchId = branch ? branch._id : undefined;

    // A default password for all mock instructors
    const defaultPassword = await bcrypt.hash("password123", 10);

    const instructorsData = [
      {
        name: "Asraful Shanto",
        email: "shanto@syict.example.com",
        password: defaultPassword,
        role: "instructor",
        avatar: "https://i.pravatar.cc/300?img=11", 
        bio: "Ex-Senior Engineer at leading tech firms. Specialized in React, Node.js and scalable architecture.",
        featuredBio: "Building the future of web dev.",
        badge: "PROFESSIONAL",
        experience: "8+ YEARS EXP.",
        expertise: ["FULL STACK DEVELOPMENT", "SYSTEM DESIGN"],
        branchId: branchId,
        socials: {
          linkedin: "https://linkedin.com/in/asraful-shanto",
          twitter: "https://twitter.com/asraful-shanto",
        },
        isVerified: true,
        isActive: true,
        isFeaturedMentor: true
      },
      {
        name: "Nusrat Jahan",
        email: "nusrat@syict.example.com",
        password: defaultPassword,
        role: "instructor",
        avatar: "https://i.pravatar.cc/300?img=5",
        bio: "Passionate about creating intuitive user interfaces. Prev at TopTal and Dribbble leading design initiatives.",
        badge: "EXPERT",
        experience: "6+ YEARS EXP.",
        expertise: ["UI/UX DESIGN", "PROTOTYPING", "FIGMA"],
        branchId: branchId,
        socials: {
          linkedin: "https://linkedin.com/in/example2",
        },
        isVerified: true,
        isActive: true,
      },
      {
        name: "Fahim Rahman",
        email: "fahim@syict.example.com",
        password: defaultPassword,
        role: "instructor",
        avatar: "https://i.pravatar.cc/300?img=12",
        bio: "React Native and Flutter advocate. Built award-winning fintech applications used by millions.",
        badge: "VETERAN",
        experience: "10+ YEARS EXP.",
        expertise: ["REACT NATIVE", "FLUTTER", "SWIFT"],
        branchId: branchId,
        socials: {
          linkedin: "https://linkedin.com/in/example3",
          twitter: "https://twitter.com/example3",
        },
        isVerified: true,
        isActive: true,
      },
      {
        name: "Sadia Afrin",
        email: "sadia@syict.example.com",
        password: defaultPassword,
        role: "instructor",
        avatar: "https://i.pravatar.cc/300?img=9",
        bio: "Machine learning researcher. Specializes in NLP, Computer Vision, and Predictive Analytics.",
        badge: "SPECIALIST",
        experience: "4+ YEARS EXP.",
        expertise: ["PYTHON", "TENSORFLOW", "MACHINE LEARNING"],
        branchId: branchId,
        socials: {
          linkedin: "https://linkedin.com/in/example4",
        },
        isVerified: true,
        isActive: true,
      },
      {
        name: "Rafiul Islam",
        email: "rafiul@syict.example.com",
        password: defaultPassword,
        role: "instructor",
        avatar: "https://i.pravatar.cc/300?img=13",
        bio: "AWS Certified Solutions Architect. Passionate about automating CI/CD pipelines and Kubernetes clusters.",
        badge: "CERTIFIED",
        experience: "7+ YEARS EXP.",
        expertise: ["AWS", "KUBERNETES", "CI/CD"],
        branchId: branchId,
        socials: {
          linkedin: "https://linkedin.com/in/example5",
        },
        isVerified: true,
        isActive: true,
      },
      {
        name: "Mehzabin Haque",
        email: "mehzabin@syict.example.com",
        password: defaultPassword,
        role: "instructor",
        avatar: "https://i.pravatar.cc/300?img=10",
        bio: "Helped 100+ startups scale their growth through SEO, SEM, and data-driven marketing strategies.",
        badge: "STRATEGIST",
        experience: "5+ YEARS EXP.",
        expertise: ["SEO", "GROWTH HACKING", "PPC"],
        branchId: branchId,
        socials: {
          linkedin: "https://linkedin.com/in/example6",
          twitter: "https://twitter.com/example6",
        },
        isVerified: true,
        isActive: true,
      }
    ];

    // Clear existing instructors from User model
    await User.deleteMany({ role: "instructor" });
    console.log("Cleared existing instructors in User collection");

    // Insert new ones
    await User.insertMany(instructorsData);
    console.log("Successfully seeded", instructorsData.length, "instructors into User collection!");

    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding instructors:", error);
    process.exit(1);
  }
}

seedInstructors();
