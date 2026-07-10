# Smart Youth ICT - Youth Empowerment & E-Commerce Platform

🌍 **Visit the live website:** [smartyouthict.com](https://smartyouthict.com)

A premium, full-stack platform built with Next.js 14 and Express 4, featuring dynamic learning experiences, interactive mapping, secure checkout, and comprehensive administrative tools.

**Next.js • React • TailwindCSS • Express • MongoDB • Stripe • NextAuth**

## 🎯 Project Description
Smart Youth ICT is a sophisticated platform designed to elevate youth engagement and technological education. It transforms traditional online platforms into a dynamic, interactive environment where learning and community remain the primary focus. Beyond simple transactions, Smart Youth ICT features interactive mapping ("Youth Hub Locations") and integrated video learning experiences, providing users with a unique digital atmosphere while they browse, learn, and engage with curated resources and events.

## ✨ Implemented Features

### 🌐 Public Features
**Landing Page** - An immersive entrance featuring engaging sections:
- **Hero Section** - Dynamic entrance with smooth transitions and clear calls to action.
- **Offer Slider** - Promotional marquee for featured events and courses.
- **Featured Content** - A curated grid of premium educational picks and resources.
- **Interactive Maps** - "Youth Hub Locations" powered by React Leaflet for finding local centers.
- **Video Learning** - Integrated video playback capabilities using React Player.
- **Value Section** - Highlighting the platform's commitment to quality education and youth empowerment.
- **Testimonials** - Community experiences presented in a premium layout.
- **CTA & Newsletter** - Elegant prompts for engagement and updates.

**Resource Exploration** - Comprehensive catalog:
- **Search & Filtering** - Filter by category, price, and topic.
- **Detailed Views** - High-fidelity resources, detailed specifications, and descriptions.
- **Interactive Reviews** - Star ratings and community feedback for each resource.

### 🔐 Authentication System
- **NextAuth Integration** - Seamless authentication flows.
- **Email/Password Auth** - Secure credentials-based login and registration (bcrypt & JWT).
- **Session Management** - Secure token-based authentication for all protected routes.
- **Protected Routes** - Middleware-guarded paths for users and administrators.

### 🛒 Shopping & E-Commerce Features
- **Cart Management** - Persistent cart management powered by Zustand.
- **Wishlist** - Save favorite courses or resources to a personal collection.
- **Checkout Flow** - Secure multi-step checkout process.
- **Stripe Integration** - Real-time credit/debit card processing for secure transactions.
- **Order Management** - Automated order generation and status tracking.
- **Notifications** - Automated transactional emails via Resend and Nodemailer.

### 👤 Admin & User Dashboards
**Customer Dashboard:**
- **Order History** - Detailed view of past acquisitions and enrollments.
- **Profile Management** - Update personal details and preferences.
- **Wishlist Overview** - Quick access to saved resources.

**Admin Dashboard:**
- **Product/Resource Management** - Full CRUD for platform inventory.
- **Order Oversight** - Track and manage all platform sales.
- **Promo Management** - Create and track promotional campaigns.
- **Message Center** - Manage contact inquiries from the community.

## 🛠️ Technology Stack

**Frontend**
- **Framework:** Next.js 14.2 (App Router)
- **UI Library:** React 18
- **Styling:** Tailwind CSS 3.4
- **Animations:** Framer Motion 12
- **State Management:** Zustand 4.5 & React Query 5
- **Mapping & Media:** React Leaflet 4.2 & React Player 2.16
- **Authentication:** NextAuth 4.24
- **Utilities:** axios, clsx, tailwind-merge, js-cookie

**Backend**
- **Server:** Express.js 4.18 (Node.js)
- **Database:** MongoDB with Mongoose 8.10
- **Security:** bcryptjs, helmet, express-rate-limit, cors
- **Auth:** jsonwebtoken & google-auth-library
- **Payment:** Stripe API
- **Files:** Multer for uploads
- **Mailing:** Nodemailer & Resend
- **Utilities:** Puppeteer (PDF/Scraping), Node-Cron

## 📁 Project Structure

```text
syict/
├── syict-frontend/           # Next.js Application
│   ├── public/              # Static assets and images
│   ├── src/                 # Source code (App Router, Components, Lib, Store)
│   ├── next.config.js       # Next.js configuration
│   └── tailwind.config.js   # Tailwind configuration
│
├── syict-backend/            # Express API Server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API endpoints
│   │   ├── middlewares/     # Auth and validation guards
│   │   └── server.js        # Entry point
│   ├── scripts/             # Utility scripts
│   └── .env                 # Environment variables
```

## 🚀 Setup & Installation

**Prerequisites**
- Node.js 18+
- MongoDB instance (Local or Atlas)
- Stripe Account (API Keys)

**Step 1: Setup Backend**
1. Navigate to backend directory:
   ```sh
   cd syict-backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create `.env` file from `.env.production` or `.env.local` and fill in credentials (MongoDB URI, JWT Secret, Stripe Keys).
4. Start the server:
   ```sh
   npm run dev
   ```

**Step 2: Setup Frontend**
1. Navigate to frontend directory:
   ```sh
   cd syict-frontend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create `.env.local` and add `NEXT_PUBLIC_API_URL` and other required keys.
4. Start the development server:
   ```sh
   npm run dev
   ```

## 🗺️ Routes Summary

**Public Routes**
- `/` - Immersive Landing Page
- `/courses` or `/products` - Resource Catalog
- `/about` - Platform Story

**Protected Routes**
- `/cart` - Acquisition Basket
- `/checkout` - Secure Payment Flow
- `/dashboard` - User Overview
- `/admin` - Control Panel

## 🔧 Development Workflow

**Concurrent Development:** Run both servers simultaneously for full functionality:
- **Backend:** http://localhost:5000 (or port defined in .env)
- **Frontend:** http://localhost:3000

## 📊 API Filtering
- `GET /api/products` (or relevant endpoints) supports advanced filtering, pagination, and sorting.

## 🌟 Future Enhancements
- **Live Webinars** - Real-time streaming for interactive sessions.
- **Gamification** - Badges and achievements for completing modules.
- **Multi-language Support** - Expanding accessibility with `next-intl`.

## 📄 License
This project is distributed under the MIT License.

---
*Built to empower the next generation through technology.*
