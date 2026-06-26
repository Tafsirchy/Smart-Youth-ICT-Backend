const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const SuccessStory = require("../src/models/SuccessStory");
const Course = require("../src/models/Course");

const STORIES = [
  {
    studentName: "Rahim Ahmed",
    studentAvatar: "https://i.pravatar.cc/150?u=rahim",
    company: "Google",
    location: "Dhaka, Bangladesh",
    storyType: "text",
    resultSummary: "Earned $5,000 on Upwork in first 6 months",
    description: "After completing the full stack course, I started freelancing. The skills I learned here helped me to land a contract with a US-based startup. SYICT provided the practical knowledge that I needed to succeed.",
    isPublished: true,
    order: 1
  },
  {
    studentName: "Sadia Rahman",
    studentAvatar: "https://i.pravatar.cc/150?u=sadia",
    company: "Toptal",
    location: "Sylhet, Bangladesh",
    storyType: "video",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    videoThumbnail: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
    resultSummary: "Got hired at a top remote agency",
    description: "The digital marketing track completely changed my career path. The instructors were incredibly supportive and guided me through building a portfolio.",
    isPublished: true,
    order: 2
  },
  {
    studentName: "Tariqul Islam",
    studentAvatar: "https://i.pravatar.cc/150?u=tariq",
    company: "Fiverr Pro",
    location: "Chittagong, Bangladesh",
    storyType: "video",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    videoThumbnail: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
    resultSummary: "Level 2 Seller on Fiverr",
    description: "UI/UX Design course taught me not just tools but how to think about users. I have worked with 50+ international clients since graduating.",
    isPublished: true,
    order: 3
  },
  {
    studentName: "Nusrat Jahan",
    studentAvatar: "https://i.pravatar.cc/150?u=nusrat",
    company: "Local Tech Firm",
    location: "Rajshahi, Bangladesh",
    storyType: "text",
    resultSummary: "Promoted to Senior Developer",
    description: "Python and AI course opened up new opportunities for me. I was able to automate processes at my current job and got promoted within 3 months.",
    isPublished: true,
    order: 4
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find a course to link the stories to
    const course = await Course.findOne({});
    if (!course) {
      console.log("No courses found. Please run seed_courses.js first.");
      process.exit(1);
    }
    
    console.log("Removing old mock success stories...");
    await SuccessStory.deleteMany({});
    
    console.log("Injecting success stories...");
    const storiesToInsert = STORIES.map((s) => ({
      ...s,
      courseId: course._id,
    }));
    
    await SuccessStory.insertMany(storiesToInsert);
    console.log(`Success! Populated ${storiesToInsert.length} success stories!`);
    
    process.exit(0);
  } catch (err) {
    console.error("Seeding success stories failed:", err);
    process.exit(1);
  }
}

seed();
