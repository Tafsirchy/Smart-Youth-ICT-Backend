const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const BlogPost = require('../src/models/BlogPost');
const User = require('../src/models/User');

const POSTS = [
  {
    title: 'Top 5 UI/UX Trends to Watch in 2026',
    slug: 'top-ui-ux-trends-2026',
    excerpt: 'Neumorphism is out, spatial computing UI is in. Here is how designers are preparing for the new web.',
    content: `<p>Design trends shift rapidly, and 2026 is no exception.</p><h3>1. Spatial Interfaces</h3><p>With AR glasses becoming mainstream, web interfaces are pushing out of the 2D bounds...</p>`,
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=600&fit=crop',
    tags: ['Design', 'Trends'],
    isPublished: true,
    views: 400
  },
  {
    title: 'The Secret to Managing 5 Freelance Clients at Once',
    slug: 'managing-multiple-freelance-clients',
    excerpt: 'Time blocking and asynchronous communication can scale your freelancing income without burning you out.',
    content: `<p>Freelancing is great until you succeed "too much". Then you are drowning in Slack messages.</p>`,
    thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=600&fit=crop',
    tags: ['Freelancing', 'Tips'],
    isPublished: true,
    views: 890
  },
  {
    title: 'Why Node.js is Still the King of the Backend',
    slug: 'why-nodejs-still-king-backend',
    excerpt: 'Despite newer runners like Bun and Deno, the Node.js ecosystem remains absolutely bulletproof for enterprise startups.',
    content: `<p>Ecosystem matters more than microsecond benchmarks...</p>`,
    thumbnail: 'https://images.unsplash.com/photo-1627398240366-419bba518177?w=1200&h=600&fit=crop',
    tags: ['Web Development', 'Trends'],
    isPublished: true,
    views: 1205
  },
  {
    title: 'Mastering English: The Ultimate Skill for Bangladeshi IT Pros',
    slug: 'mastering-english-bd-it-pros',
    excerpt: 'Your code compiles perfectly, but your client dropped you. Here is how mastering English changes your conversion rate.',
    content: `<p>If you cannot explain your code, you cannot sell your code...</p>`,
    thumbnail: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1200&h=600&fit=crop',
    tags: ['Career', 'Tips'],
    isPublished: true,
    views: 220
  },
  {
    title: 'How to Build a Portfolio That Gets You Hired Immediately',
    slug: 'build-portfolio-gets-hired',
    excerpt: 'Stop showing landing pages. Start showing Full-Stack CRUD apps that solve actual business problems.',
    content: `<p>A to-do app will not get you a job in 2026...</p>`,
    thumbnail: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&h=600&fit=crop',
    tags: ['Career', 'Web Development'],
    isPublished: true,
    views: 560
  },
  {
    title: 'Understanding AI: Will ChatGPT Replace Your Coding Job?',
    slug: 'will-chatgpt-replace-coding-job',
    excerpt: 'The short answer is no. The long answer is yes, if you refuse to learn how to use it.',
    content: `<p>AI is a tool, not a replacement for domain logic...</p>`,
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=600&fit=crop',
    tags: ['AI', 'Trends'],
    isPublished: true,
    views: 3100
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    const authorId = admin ? admin._id : new mongoose.Types.ObjectId();

    const postsWithAuthor = POSTS.map(p => ({ ...p, author: authorId }));
    await BlogPost.insertMany(postsWithAuthor);
    console.log('Success! Added 6 more posts.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
