const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Course = require('../src/models/Course');
const User = require('../src/models/User');

const COURSES = [
  {
    title: { en: 'Full Stack MERN Masterclass 2026', bn: 'ফুল স্ট্যাক ওয়েব ডেভেলপমেন্ট' },
    slug: 'full-stack-mern-masterclass-2026',
    isMaster: true,
    description: { en: 'Master React, Node.js, Express, and MongoDB by building massive, production-ready applications. Skip the fluff and learn modern architectural patterns like edge computing, microservices, and secure authentication flows.' },
    tagline: 'Zero to Hired: The only Web Development roadmap you need.',
    outcomes: ['Architect high-performance React applications.', 'Build advanced REST APIs.'],
    targetAudience: ['Absolute Beginners', 'Computer Science Students'],
    language: 'Bengali / English',
    mode: 'Online Live & Recorded',
    category: 'web-dev',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=800&fit=crop',
    previewVideo: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    price: 8500,
    originalPrice: 15000,
    duration: '6 Months',
    isPublished: true,
    features: [{ iconKey: 'FaReact', text: '50+ Hours of React/Next.js content' }],
    projects: [{ title: 'E-Commerce Marketplace', desc: 'A full-scale digital product marketplace', techs: ['React', 'Node.js'], image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&fit=crop'}],
    faqs: [{ question: 'Do I need prior coding experience?', answer: 'No! This course is designed from absolute zero.' }],
    curriculum: [{ title: 'Module 1: Foundations', duration: '10h 15m', isFree: true, topics: ['HTML5', 'CSS3'] }]
  },
  {
    title: { en: 'Advanced Graphic Design & UI/UX', bn: 'গ্রাফিক ডিজাইন ও ইউআই/ইউএক্স' },
    slug: 'advanced-graphic-design-ui-ux',
    isMaster: true,
    description: { en: 'Learn Adobe Illustrator, Photoshop, and Figma from industry veterans. Design stunning brand identities, vector illustrations, and intuitive mobile app interfaces.' },
    tagline: 'Design digital experiences that wow the world.',
    outcomes: ['Master Adobe Photoshop', 'Create scalable vector graphics using Illustrator.'],
    targetAudience: ['Creative Thinkers', 'Freelancers'],
    language: 'Bengali Only',
    mode: 'Hybrid (Offline + Online)',
    category: 'graphic-design',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=800&fit=crop',
    price: 6000,
    originalPrice: 10000,
    duration: '4 Months',
    isPublished: true,
    features: [{ iconKey: 'FaFigma', text: 'Live Figma collaboration sessions' }],
    projects: [{ title: 'Fintech App UI Design', desc: 'A banking application interface.', techs: ['Figma'], image: 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?w=800&fit=crop' }],
    faqs: [{ question: 'Do I need a strong computer?', answer: 'A minimum of 8GB RAM is recommended.' }],
    curriculum: [{ title: 'Module 1: Design Fundamentals', duration: '5h 0m', isFree: true, topics: ['Color Wheels', 'Typography rules'] }]
  },
  {
    title: { en: 'Digital Marketing & SEO Mastery', bn: 'ডিজিটাল মার্কেটিং ও এসইও' },
    slug: 'digital-marketing-seo-mastery',
    isMaster: true,
    description: { en: 'Learn how to generate massive traffic, run profitable Facebook Ads, and outrank competitors on Google. This course covers the entire spectrum of Social Media Marketing.' },
    tagline: 'Dominate search engines and social media algorithms.',
    outcomes: ['Run high-converting Facebook campaigns', 'Master Technical and On-Page SEO'],
    targetAudience: ['Entrepreneurs', 'Marketing Students'],
    language: 'English Only',
    mode: '100% Online',
    category: 'smm',
    thumbnail: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=1200&h=800&fit=crop',
    price: 5500,
    originalPrice: null,
    duration: '3 Months',
    isPublished: true,
    features: [{ iconKey: 'FaFacebook', text: 'Live Ad Account Audits' }],
    projects: [{ title: 'Dropshipping Ad Campaign', desc: 'Case study scaling a product to $5k/m', techs: ['Meta Ads', 'Google Ads'], image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&fit=crop' }],
    faqs: [{ question: 'Do I need money for ads?', answer: 'We recommend at least $50 ad spend for practice.' }],
    curriculum: [{ title: 'Module 1: SEO Basics', duration: '8h 0m', isFree: true, topics: ['Keyword Research', 'Backlinking Strategies'] }]
  },
  {
    title: { en: 'Applied AI & ChatGPT Engineering', bn: 'এআই ও চ্যাটজিপিটি' },
    slug: 'applied-ai-chatgpt-engineering',
    isMaster: true,
    description: { en: 'Future-proof your career by mastering Prompt Engineering, fine-tuning large language models, and automating your daily workflows using cutting-edge AI tools.' },
    tagline: 'AI will not replace you. A person using AI will.',
    outcomes: ['Write complex system prompts', 'Automate data extraction using Python and OpenAI APIs'],
    targetAudience: ['Developers', 'Productivity Seekers'],
    language: 'Bengali / English',
    mode: 'Online Live',
    category: 'ai',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=800&fit=crop',
    price: 7000,
    originalPrice: 12000,
    duration: '2 Months',
    isPublished: true,
    features: [{ iconKey: 'FaRobot', text: 'Free OpenAI API Credits included' }],
    projects: [{ title: 'Custom PDF Chatbot', desc: 'Upload a PDF and ask the AI questions about it.', techs: ['Python', 'OpenAI', 'LangChain'], image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&fit=crop' }],
    faqs: [{ question: 'Do I need to know Python?', answer: 'Basic Python is helpful but not strictly required.' }],
    curriculum: [{ title: 'Module 1: Prompt Engineering', duration: '6h 30m', isFree: true, topics: ['Few-shot prompting', 'Chain of thought reasoning'] }]
  },
  {
    title: { en: 'Ethical Hacking & Cyber Security Bootcamp', bn: 'ইথিক্যাল হ্যাকিং' },
    slug: 'ethical-hacking-cyber-security',
    isMaster: true,
    description: { en: 'Learn to protect networks, identify vulnerabilities, and secure web applications. Dive deep into penetration testing using Kali Linux and real-world vulnerability labs.' },
    tagline: 'Think like a hacker to protect like a pro.',
    outcomes: ['Master Penetration Testing workflows', 'Perform web application security audits'],
    targetAudience: ['IT Professionals', 'Tech Enthusiasts'],
    language: 'Bengali Only',
    mode: 'Offline Campus Only',
    category: 'other',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=800&fit=crop',
    price: 12000,
    originalPrice: 18000,
    duration: '6 Months',
    isPublished: true,
    features: [{ iconKey: 'FaShieldAlt', text: 'Real Vulnerability Labs (CTF)' }],
    projects: [{ title: 'SQL Injection Audit', desc: 'Secure an intentionally vulnerable web application.', techs: ['Kali Linux', 'Burp Suite'], image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&fit=crop' }],
    faqs: [{ question: 'Is this legal?', answer: 'Yes, we teach Ethical hacking with permission on isolated networks.' }],
    curriculum: [{ title: 'Module 1: Linux Basics', duration: '12h 0m', isFree: true, topics: ['Command Line mastery', 'Network Protocols'] }]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find an admin user to own the courses
    const admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    if (!admin) {
      console.log('No admin found to attach courses to. Seeding aborted.');
      process.exit(1);
    }

    console.log('Removing old mock courses...');
    await Course.deleteMany({}); // Start completely clean to avoid duplicates

    console.log('Injecting 5 diverse, high-fidelity mock courses...');
    const coursesToInsert = COURSES.map(c => ({
      ...c,
      instructor: admin._id,
      branchId: admin.branchId || null
    }));

    await Course.insertMany(coursesToInsert);
    console.log('Success! Populated ' + coursesToInsert.length + ' premium courses!');
    
    process.exit(0);
  } catch (err) {
    console.error('Seeding courses failed:', err);
    process.exit(1);
  }
}

seed();
