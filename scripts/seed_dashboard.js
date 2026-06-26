const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require("mongoose");
require("dotenv").config();

// Models
const User = require("../src/models/User");
const Course = require("../src/models/Course");
const Branch = require("../src/models/Branch");
const Enrollment = require("../src/models/Enrollment");
const Assignment = require("../src/models/Assignment");
const Submission = require("../src/models/Submission");
const Certificate = require("../src/models/Certificate");
const Payment = require("../src/models/Payment");
const Portfolio = require("../src/models/Portfolio");
const SupportTicket = require("../src/models/SupportTicket");
const Affiliate = require("../src/models/Affiliate");
const LeadCRM = require("../src/models/LeadCRM");
const Asset = require("../src/models/Asset");

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/syict";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for Seeding Dashboard Data...");

    // Create a Branch
    const branch = await Branch.findOneAndUpdate(
      { code: "BR-SEED" },
      {
        name: "Uttara Seed Branch",
        code: "BR-SEED",
        type: "local",
        location: { type: "Point", coordinates: [90.399452, 23.777176] },
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log("Branch seeded:", branch.name);

    // Create Users (Student, Instructor, Admin, Super Admin)
    const superAdmin = await User.findOneAndUpdate(
      { email: "super@seed.com" },
      {
        name: "Super Admin",
        email: "super@seed.com",
        password: "password123",
        role: "super_admin",
        branchId: branch._id,
        avatar: "https://i.pravatar.cc/150?img=68",
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const admin = await User.findOneAndUpdate(
      { email: "admin@seed.com" },
      {
        name: "Branch Admin",
        email: "admin@seed.com",
        password: "password123",
        role: "branch_admin",
        branchId: branch._id,
        avatar: "https://i.pravatar.cc/150?img=32",
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const instructor = await User.findOneAndUpdate(
      { email: "instructor@seed.com" },
      {
        name: "Farhan Ahmed",
        email: "instructor@seed.com",
        password: "password123",
        role: "instructor",
        branchId: branch._id,
        avatar: "https://i.pravatar.cc/150?img=53",
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const student1 = await User.findOneAndUpdate(
      { email: "tafsirchy1000@gmail.com" },
      {
        name: "M TAFSIRUL ISLAM CHOWDHURY",
        email: "tafsirchy1000@gmail.com",
        role: "student",
        branchId: branch._id,
        isVerified: true,
        affiliateCode: "TAFSIR500"
      },
      { upsert: true, new: true }
    );
    console.log("Users seeded");

    // Create Courses
    const course1 = await Course.findOneAndUpdate(
      { slug: "mern-stack-seed" },
      {
        title: { en: "MERN Stack Web Development Mastery", bn: "MERN স্ট্যাক ওয়েব ডেভেলপমেন্ট" },
        slug: "mern-stack-seed",
        branchId: branch._id,
        category: "web-dev",
        instructor: instructor._id,
        price: 15000,
        isPublished: true,
        thumbnail: "https://picsum.photos/seed/mern-stack/400/300"
      },
      { upsert: true, new: true }
    );
    console.log("Course seeded");

    // Let's create an enrollment or progress if progress model exists
    // But since the frontend uses /courses/enrolled, it might check Progress or Enrollment
    // Let's seed an Enrollment
    if (Enrollment) {
      await Enrollment.findOneAndUpdate(
        { user: student1._id, course: course1._id },
        {
          user: student1._id,
          course: course1._id,
          branchId: branch._id,
          paymentStatus: "paid"
        },
        { upsert: true, new: true }
      );
    }
    
    // Support Ticket
    if (SupportTicket) {
       await SupportTicket.findOneAndUpdate(
         { user: student1._id, subject: "Issue with lesson video playback" },
         {
           user: student1._id,
           subject: "Issue with lesson video playback",
           message: "The video for lesson 12 is buffering constantly.",
           status: "open",
           priority: "medium"
         },
         { upsert: true, new: true }
       );
    }

    let assignment = null;
    if (Assignment) {
      assignment = await Assignment.findOneAndUpdate(
        { course: course1._id, title: "Build a REST API with Express" },
        {
          course: course1._id,
          lessonTitle: "Express Basics",
          title: "Build a REST API with Express",
          description: "Build an API.",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        { upsert: true, new: true }
      );
    }

    if (Submission && assignment) {
      await Submission.findOneAndUpdate(
        { student: student1._id, assignment: assignment._id },
        {
          student: student1._id,
          assignment: assignment._id,
          fileUrl: "https://github.com/tafsir/api",
          status: "graded",
          grade: 95
        },
        { upsert: true, new: true }
      );
    }
    // Payment
    if (Payment) {
      await Payment.findOneAndUpdate(
        { user: student1._id, course: course1._id },
        {
          user: student1._id,
          course: course1._id,
          amount: 15000,
          currency: "BDT",
          status: "completed",
          method: "bkash",
          transactionId: "TRX123456"
        },
        { upsert: true, new: true }
      );
    }

    // Portfolio
    if (Portfolio) {
      await Portfolio.findOneAndUpdate(
        { student: student1._id },
        {
          student: student1._id,
          bio: "I am a passionate web developer.",
          skills: ["React", "Node.js", "MongoDB"],
          projects: [
            {
              title: "Weather App Dashboard",
              description: "React-based weather application utilizing open weather APIs.",
              projectUrl: "https://github.com/tafsir/weather-app",
              imageUrl: "https://picsum.photos/seed/port-weather/400/300"
            }
          ]
        },
        { upsert: true, new: true }
      );
    }

    // Certificate
    if (Certificate) {
      await Certificate.findOneAndUpdate(
        { student: student1._id, course: course1._id },
        {
          student: student1._id,
          course: course1._id,
          credentialId: "SYICT-MERN-2026-" + Math.floor(Math.random()*10000),
          issueDate: new Date()
        },
        { upsert: true, new: true }
      );
    }

    // Affiliate
    if (Affiliate) {
      await Affiliate.findOneAndUpdate(
        { user: student1._id },
        {
          user: student1._id,
          referralCode: "TAFSIR500",
          totalEarnings: 1500
        },
        { upsert: true, new: true }
      );
    }

    console.log("✅ Seed data successfully pushed to database.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
