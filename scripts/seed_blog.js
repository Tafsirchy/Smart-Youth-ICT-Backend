const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const BlogPost = require('../src/models/BlogPost');
const User = require('../src/models/User');

const POSTS = [
  {
    title: 'The Future of Web Development in Bangladesh (2026)',
    slug: 'future-of-web-development-bangladesh',
    excerpt: 'As companies rapidly adapt to AI and cloud architectures, learning robust foundational Web Development is more critical than ever. Here is what to expect.',
    content: `<h2>The Rise of Next-Gen Technologies</h2>
<p>Bangladesh is officially entering the golden era of IT. Companies from North America and Europe are outsourcing advanced product engineering tasks rather than simple maintenance assignments.</p>
<h3>Why Next.js & React Dominate</h3>
<p>Modern developers are expected to understand Server-Side Rendering (SSR) and Edge Computing. The days of plain HTML/CSS are over. If you want to crack a $2,000/month remote job, you must master the complete MERN stack combined with modern frameworks like Next.js.</p>
<blockquote>"The best time to learn to code was 10 years ago. The second best time is today."</blockquote>
<p>Here at Smart Youth ICT, our Web Development Masterclass covers precisely this modern ecosystem, preparing you to bypass local competition and aim for global opportunities.</p>`,
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=600&fit=crop',
    tags: ['Career', 'Web Development'],
    isPublished: true,
    views: 1250
  },
  {
    title: 'How to Crack Your First Upwork Client in 2026',
    slug: 'crack-first-upwork-client-2026',
    excerpt: 'Is Upwork saturated? Not if you understand how to bypass the noise. Read our instructors comprehensive guide on landing your first $500 milestone.',
    content: `<h2>Stop Using Generic Proposals</h2>
<p>If your Upwork proposal starts with "Dear Hiring Manager, I am a hardworking individual with 5 years of experience", you have already lost the client's attention.</p>
<h3>The Loom Video Strategy</h3>
<p>Instead of writing paragraphs, record a 2-minute Loom video walking through exactly how you will solve their problem. <strong>Show, do not just tell.</strong> If the client needs a React Native app bug fixed, point out the likely cause of the bug in their provided screenshots.</p>
<ul>
<li><strong>Step 1:</strong> Read the description twice.</li>
<li><strong>Step 2:</strong> Find one specific problem they mentioned.</li>
<li><strong>Step 3:</strong> Record a quick video offering a mini-solution or strategy for that problem.</li>
<li><strong>Step 4:</strong> Submit proposal with the link.</li>
</ul>
<p>This single strategy has helped our SYICT students generate over $100k+ in combined freelancing revenue.</p>`,
    thumbnail: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200&h=600&fit=crop',
    tags: ['Freelancing', 'Tips'],
    isPublished: true,
    views: 3420
  },
  {
    title: 'Why Soft Skills are Just as Important as Hard Coding Skills',
    slug: 'soft-skills-importance-in-tech',
    excerpt: 'You might be the fastest coder in your class, but if you cannot communicate effectively with clients, your career growth will stall.',
    content: `<h2>The Myth of the Lone Programmer</h2>
<p>Many young students believe that if they just memorize syntax and build complex algorithms, jobs will hunt them down. This is fundamentally false.</p>
<p>In 2026, companies hire team players. They want engineers who can clearly document their API endpoints, speak professionally during Zoom meetings, and handle critical client feedback gracefully without ego.</p>
<h3>Mastering Professional English</h3>
<p>At Smart Youth ICT, we strictly require students to practice English communication. If you are struggling with client conversions, chances are it's not your code—it's your communication. Dedicate at least 30 minutes a day to practicing professional IT terminology in English.</p>`,
    thumbnail: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=600&fit=crop',
    tags: ['Career', 'Trends'],
    isPublished: true,
    views: 890
  }
];

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // Find an admin user to be the author
    const admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    const authorId = admin ? admin._id : new mongoose.Types.ObjectId();

    console.log('Clearing existing posts...');
    await BlogPost.deleteMany({});

    console.log('Injecting dummy posts...');
    const postsWithAuthor = POSTS.map(p => ({ ...p, author: authorId }));
    await BlogPost.insertMany(postsWithAuthor);

    console.log('Success! Populated ' + postsWithAuthor.length + ' posts.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
