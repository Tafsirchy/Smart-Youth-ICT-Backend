const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Models
const CareerTrack = require('../models/CareerTrack');
const CertificationProgram = require('../models/CertificationProgram');
const FreelancingTraining = require('../models/FreelancingTraining');
const JobPlacement = require('../models/JobPlacement');
const ServicePageContent = require('../models/ServicePageContent');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        // 1. Clear existing
        await CareerTrack.deleteMany({});
        await CertificationProgram.deleteMany({});
        await FreelancingTraining.deleteMany({});
        await JobPlacement.deleteMany({});
        await ServicePageContent.deleteMany({});

        // 2. Career Tracks Items
        await CareerTrack.create([
            {
                title: "Web Engineering",
                description: "Master the full-stack ecosystem and build high-performance web applications.",
                phase1: "Frontend & UI Fundamentals (HTML, CSS, JS, Tailwind)",
                phase2: "React & Next.js Architecture (State, Routing, APIs)",
                phase3: "Backend & Databases (Node.js, Express, MongoDB)",
                phase4: "Full-Stack Deployment & Freelance Preparation",
                duration: "6 Months",
                outcome: "Junior Full-Stack Engineer",
                color: "from-blue-500 to-cyan-400",
                bg: "bg-blue-500",
                order: 1
            },
            {
                title: "Artificial Intelligence",
                description: "Dive into machine learning, data science, and the future of Generative AI.",
                phase1: "Python Core Logic & Data Structures",
                phase2: "Data Science (Pandas, Numpy, Matplotlib)",
                phase3: "Machine Learning (Scikit-Learn, Regression, Validation)",
                phase4: "Generative AI & API Integrations (OpenAI, LangChain)",
                duration: "5 Months",
                outcome: "AI Application Specialist",
                color: "from-emerald-500 to-teal-400",
                bg: "bg-emerald-500",
                order: 2
            },
            {
                title: "Social Media & Growth",
                description: "Analyze, strategize, and scale brands using modern performance marketing.",
                phase1: "Social Media Branding & Creative Design (Canva/Figma)",
                phase2: "Technical SEO & Inbound Content Marketing",
                phase3: "Paid Ads Mastery (Meta Ads Manager, Google Ads)",
                phase4: "Analytics, Reporting, and Client Acquisition",
                duration: "4 Months",
                outcome: "Growth Marketing Manager",
                color: "from-rose-500 to-pink-400",
                bg: "bg-rose-500",
                order: 3
            }
        ]);

        // 3. Certifications Items
        await CertificationProgram.create([
            {
                title: "Professional Certification",
                description: "Mastery in global industrial standards and technical competencies.",
                badgeText: "Authorized Validation",
                features: ["Academic Validation", "Skill Verification", "Portfolio Audit"],
                order: 1
            },
            {
                title: "Technical Assessment",
                description: "Comprehensive vetting of core logic and practical problem-solving.",
                badgeText: "Expert Vetting",
                features: ["ISO Valid Authority", "Cryptographic Digital ID", "Direct LinkedIn Integration"],
                order: 2
            }
        ]);

        // 4. Freelancing Training Items
        await FreelancingTraining.create({
            classifications: [
                {
                    title: "Upwork Strategy",
                    type: "High-Ticket Bidding",
                    desc: "Master the art of long-term contract acquisition on the world's leading professional network.",
                    color: "bg-emerald-600",
                    features: ["Profile SEO Optimization", "Proposal Psychology", "Contract Management"]
                },
                {
                    title: "Fiverr Ecosystem",
                    type: "Gig Optimization",
                    desc: "Build a passive recurring income stream by optimizing gig ranking and delivery speed.",
                    color: "bg-green-600",
                    features: ["Keyword Research", "Tiered Pricing Models", "Fast Delivery Workflows"]
                }
            ],
            phases: [
                { step: "01", title: "Technical Fundamentals", desc: "Master the niche skills that clients actually pay for in the global market." },
                { step: "02", title: "Marketplace Blueprint", desc: "Setting up ironclad profiles and establishing authority indicators." },
                { step: "03", title: "Acquisition Mastery", desc: "Writing magnetic proposals and mastering the technical bidding process." },
                { step: "04", title: "Agency Scaling", desc: "Moving from individual freelancer to building a sustainable agency team." }
            ]
        });

        // 5. Job Placement Items
        await JobPlacement.create({
            stats: { partners: "120+", rate: "90%" },
            placements: [
                {
                    title: "Overseas Placements",
                    type: "Remote/Relocation",
                    desc: "Access to high-paying roles in developed tech ecosystems like USA, EU, and UAE.",
                    color: "bg-blue-600",
                    avgSalary: "$2.5k - $5k / Mo"
                },
                {
                    title: "Local Tech Ecosystem",
                    type: "Direct Referrals",
                    desc: "Exclusive access to Bangladesh's top software firms and growing tech giants.",
                    color: "bg-indigo-600",
                    avgSalary: "80k - 150k BDT"
                },
                {
                    title: "Marketing & Growth Roles",
                    type: "Startup Specialized",
                    desc: "Fast-track roles in unicorn startups and performance marketing agencies.",
                    color: "bg-cyan-600",
                    avgSalary: "120k+ BDT"
                }
            ],
            lifecycle: [
                { step: "Phase 01", title: "Technical Evaluation", d: "A rigorous deep-dive into your codebase and architecture logic." },
                { step: "Phase 02", title: "Pre-matching Interview", d: "Simulated stress-tests with our internal industry hiring board." },
                { step: "Phase 03", title: "Exclusive Referral", d: "Direct submission to founder-level contacts at partner firms." },
                { step: "Phase 04", title: "Negotiation Support", d: "Ensuring you secure the compensation package you truly deserve." }
            ]
        });

        // 6. Page Contents (Hero/Methodology for all services)
        await ServicePageContent.insertMany([
            {
                pageType: 'skill-development',
                hero: {
                    badge: "Industry-Approved Curriculum",
                    title: "Skill Development Programs",
                    subtitle: "The Academy",
                    description: "We don't teach theory. You'll spend 90% of your time building real-world projects that you can immediately showcase to global employers."
                },
                methodology: [
                    { title: "1. Hands-On Projects", description: "No boring lectures. You are coding, designing, and marketing from day one." },
                    { title: "2. Expert Mentors", description: "Learn directly from senior industry professionals who are currently working in top agencies." },
                    { title: "3. Portfolio Ready", description: "Graduate with 5+ complete, high-quality projects ready for your Upwork or LinkedIn profile." }
                ],
                cta: {
                    title: "Not sure which program to pick?",
                    description: "Schedule a free 15-minute counseling session with our academic advisors. We'll assess your interests and recommend the perfect career path.",
                    buttonText: "Book Free Counseling"
                }
            },
            {
                pageType: 'career-tracks',
                hero: {
                    badge: "Zero To Hero",
                    title: "Career Tracks",
                    subtitle: "(Web, AI, SMM)",
                    description: "Stop jumping between random YouTube tutorials. Select a track, follow our rigorously tested curriculum, and launch your tech career methodically."
                }
            },
            {
                pageType: 'certifications',
                hero: {
                    badge: "Official Validation",
                    title: "Certification",
                    subtitle: "Programs",
                    description: "Boost your resume instantly. Our certification programs assess your skills through rigorous practical exams and issue a verified digital certificate recognized by global hiring partners."
                }
            },
            {
                pageType: 'freelancing',
                hero: {
                    badge: "Digital Sovereignty",
                    title: "Freelancing",
                    subtitle: "Success Training",
                    description: "Master the art of high-ticket client acquisition on global marketplaces. We don't just teach skills; we build successful remote careers."
                }
            },
            {
                pageType: 'job-placement',
                hero: {
                    badge: "Your Career Launchpad",
                    title: "Job Placement",
                    subtitle: "Support Cell",
                    description: "Graduation is just the beginning. Our dedicated placement cell actively maps our top talent with high-growth tech hiring partners worldwide."
                }
            }
        ]);

        console.log('✅ All Services Data Seeded Successfully!');
        process.exit();
    } catch (err) {
        console.error('❌ Seeding Error:', err);
        process.exit(1);
    }
};

seedData();
