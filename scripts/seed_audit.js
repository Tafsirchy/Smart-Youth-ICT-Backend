const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const Branch = require('../src/models/Branch');
const User = require('../src/models/User');
const Course = require('../src/models/Course');
const Enrollment = require('../src/models/Enrollment');
const Invoice = require('../src/models/Invoice');
const LeadCRM = require('../src/models/LeadCRM');
const Asset = require('../src/models/Asset');
const Session = require('../src/models/Session');

const MONGO_URI = process.env.MONGO_URI;

const seed = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB...');

        // Clear existing for clean audit
        await Branch.deleteMany({});
        await User.deleteMany({ role: { $ne: 'super_admin' } });
        await Course.deleteMany({});
        await Enrollment.deleteMany({});
        await Invoice.deleteMany({});
        await LeadCRM.deleteMany({});
        await Asset.deleteMany({});
        await Session.deleteMany({});
        console.log('Cleared existing collections');

        // 1. Create 5 Branches
        const branches = [];
        for (let i = 1; i <= 5; i++) {
            branches.push(await Branch.create({
                name: `SYICT Branch ${i}`,
                code: `BR${i}`,
                contact: { email: `branch${i}@syict.com` },
                isActive: true
            }));
        }
        console.log('Created 5 Branches');

        // 2. Create 5 Instructors (one per branch to be course owners)
        const instructors = [];
        for (let i = 0; i < 5; i++) {
            instructors.push(await User.create({
                name: `Instructor Branch ${i+1}`,
                email: `instr${i+1}@syict.com`,
                password: 'password123',
                role: 'instructor',
                branchId: branches[i]._id
            }));
        }
        console.log('Created 5 Instructors');

        // 3. Create 5 Admins (one per branch)
        const admins = [];
        for (let i = 0; i < 5; i++) {
            admins.push(await User.create({
                name: `Admin Branch ${i+1}`,
                email: `admin${i+1}@syict.com`,
                password: 'password123',
                role: 'branch_admin',
                branchId: branches[i]._id
            }));
        }
        console.log('Created 5 Branch Admins');

        // 4. Create 5 Students per branch
        const students = [];
        for (let i = 0; i < 5; i++) {
            for (let j = 1; j <= 5; j++) {
                students.push(await User.create({
                    name: `Student ${j} Branch ${i+1}`,
                    email: `student${i+1}-${j}@syict.com`,
                    password: 'password123',
                    role: 'student',
                    branchId: branches[i]._id
                }));
            }
        }
        console.log('Created 25 Students');

        // 5. Create 5 Master Courses
        const masters = [];
        for (let i = 1; i <= 5; i++) {
            masters.push(await Course.create({
                title: { en: `Master Course ${i}`, bn: `মাস্টার কোর্স ${i}` },
                slug: `master-course-${i}`,
                description: { en: 'Global curriculum template', bn: 'গ্লোবাল কারিকুলাম টেমপ্লেট' },
                isMaster: true,
                category: 'web-dev',
                instructor: instructors[0]._id, // Super Admin/Global Instr
                price: 5000 + (i * 1000),
                isPublished: true
            }));
        }
        console.log('Created 5 Master Courses');

        // 6. Create 1 Enrollments, Invoices, Leads, Assets, Sessions per branch
        for (let i = 0; i < 5; i++) {
            const bId = branches[i]._id;
            const sId = students[i*5]._id;
            const instrId = instructors[i]._id;
            const mId = masters[i]._id;

            // Course Batch
            const courseBatch = await Course.create({
                title: { en: `Batch Course B${i+1}`, bn: `ব্যাচ কোর্স B${i+1}` },
                description: { en: 'Branch specific course', bn: 'ব্রাঞ্চ স্পেসিফিক কোর্স' },
                isMaster: false,
                isPublished: true,
                category: 'web-dev',

                instructor: instrId,
                masterCourseId: mId,
                branchId: bId,
                price: 5000 + (i * 500),
                slug: `branch-${i+1}-course-${i+1}`
            });

            // Enrollment
            const enrollment = await Enrollment.create({
                user: sId,
                course: courseBatch._id,
                branchId: bId,
                paymentStatus: 'pending'
            });

            // Invoice
            await Invoice.create({
                user: sId,
                course: courseBatch._id,
                invoiceNo: `INV-B${i+1}-001`,
                amount: 5000,
                total: 5000,
                status: 'pending',
                branchId: bId,
                items: [{ description: 'Admission Fee', amount: 5000 }]
            });

            // Lead
            await LeadCRM.create({
                name: `Lead ${i+1}`,
                email: `lead${i+1}@gmail.com`,
                status: 'new',
                branchId: bId
            });

            // Asset
            await Asset.create({
                name: `Laptop B${i+1}`,
                category: 'electronics',
                unitPrice: 45000,
                branchId: bId
            });

            // Session
            await Session.create({
                title: `Live Class B${i+1}`,
                course: courseBatch._id,
                branchId: bId,
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000), // 1 hour later
                meetingLink: 'https://zoom.us/test',
                instructor: instrId,
                platform: 'zoom'
            });

            // Notification
            const Notification = require('../src/models/Notification');
            await Notification.create({
                title: `Welcome to Branch ${i+1}`,
                message: 'Glad to have you with us!',
                targetRole: 'all',
                branchId: bId
            });
        }
        console.log('Created per-branch dummy data (Enrollments, Invoices, Leads, Assets, Sessions, Notifications)');




        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
