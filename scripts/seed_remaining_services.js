const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: "E:/SYICT/syict-backend/.env" });
const WebServiceContent = require("../src/models/WebServiceContent");

const enrichedServices = [
  /* ══════════════════════════════════════════════════════
     SEO OPTIMIZATION
  ══════════════════════════════════════════════════════ */
  {
    pageType: "seo",
    landing: {
      hero: {
        badge: "Search Engine Optimization & Authority",
        title: "SEO Optimization & Search Dominance",
        subtitle: "Search Dominance",
        description: "We don't chase algorithms; we engineer structural authority. Our enterprise SEO framework combines deep technical architecture, Core Web Vitals optimization, semantic topical clusters, and high-impact digital PR to secure permanent top rankings.",
      },
      sections: {
        metrics: [
          { label: "Core Web Vitals", value: "100% Pass", desc: "Sub-second LCP and zero cumulative layout shift" },
          { label: "Organic Visibility", value: "+240%", desc: "Average client keyword visibility surge within 90 days" },
          { label: "Topical Coverage", value: "Entity-First", desc: "Comprehensive semantic knowledge graph dominance" },
          { label: "Attribution", value: "100% Tracked", desc: "Multi-touch search-to-revenue conversion reporting" }
        ],
        pillars: [
          {
            title: "Technical Architecture & Core Web Vitals",
            desc: "Eliminating crawl bottlenecks, JavaScript rendering errors, and hydration latency to ensure search engines index your pages with zero friction.",
            icon: "CodeSlash",
            badge: "Technical Core",
            highlights: [
              "Sub-Second LCP & Zero Layout Shift",
              "Dynamic XML & Robots.txt Architecture",
              "Hydration & SSR Indexing Assurance",
              "Canonical & Internal Link Hierarchy"
            ]
          },
          {
            title: "Semantic Entity & Topical Clusters",
            desc: "Moving beyond basic keywords into NLP-driven semantic entity mapping. We establish undisputed topical authority across your industry's knowledge graph.",
            icon: "Layers",
            badge: "Content Science",
            highlights: [
              "NLP Semantic Entity Mapping",
              "Topical Cluster Hub & Spoke Logic",
              "Search Intent & Buyer Journey Alignment",
              "E-E-A-T Authority Signal Injection"
            ]
          },
          {
            title: "Schema Markup & Microdata Engineering",
            desc: "Injecting comprehensive JSON-LD structured data so search engines understand your exact business schema, products, reviews, and corporate hierarchy.",
            icon: "GitNetwork",
            badge: "Structured Data",
            highlights: [
              "Custom JSON-LD Microdata Suites",
              "Rich Snippet & FAQ Schema Enhancements",
              "Organization & Knowledge Graph Nodes",
              "Breadcrumb & Article Attribution"
            ]
          },
          {
            title: "High-DA Digital PR & Authority Bridge",
            desc: "Securing permanent editorial brand mentions and contextual backlinks from tier-1 industry publications to command enduring domain authority.",
            icon: "ShieldCheckmark",
            badge: "Authority",
            highlights: [
              "White-Hat Editorial Link Acquisition",
              "High-DA Niche Publication Coverage",
              "Brand Equity & Anchor Text Diversification",
              "Toxic Backlink Audit & Disavow Maintenance"
            ]
          }
        ],
        deliverables: [
          {
            title: "Exhaustive Technical SEO Audit (PDF & Notion)",
            desc: "Comprehensive 50+ point diagnostic analyzing site architecture, Core Web Vitals, server response times, and indexing friction points.",
            formats: ["Technical PDF", "Interactive Notion", "Crawl Logs"]
          },
          {
            title: "Topical Content Cluster Roadmap",
            desc: "Structured roadmap detailing parent pillar pages and supporting sub-clusters designed to capture high-intent commercial keywords.",
            formats: ["Topical Map", "Keyword Matrix", "Briefs"]
          },
          {
            title: "Complete JSON-LD Structured Data Suite",
            desc: "Production-ready JSON-LD schema files formatted for your CMS to trigger high-visibility rich snippets and knowledge graph nodes.",
            formats: ["JSON-LD", "Schema Kit", "Integration Guide"]
          },
          {
            title: "Core Web Vitals Speed Optimization",
            desc: "Code-level optimizations compressing assets, deferring non-critical scripts, and optimizing font delivery for 95+ PageSpeed scores.",
            formats: ["Code Patches", "Asset Optimizations", "Lighthouse 95+"]
          },
          {
            title: "High-DA Backlink Acquisition Suite",
            desc: "Real-time verified backlink reports with exact DA, contextual anchor texts, and organic placement verification.",
            formats: ["Live Report", "DA 50+ Placements", "PR Clippings"]
          },
          {
            title: "Real-Time Rank Velocity & Revenue Dashboard",
            desc: "Custom Looker Studio dashboard tracking keyword rank movements, organic click-through rates, and attributed pipeline revenue.",
            formats: ["Looker Studio", "Weekly Reports", "Conversion Logs"]
          }
        ],
        phases: [
          {
            step: "01",
            phase: "Technical Crawl & Entity Baseline Audit",
            duration: "Days 1-5",
            desc: "Deploying enterprise deep-crawlers to identify indexing bottlenecks, Core Web Vitals failures, duplicate content, and semantic entity gaps."
          },
          {
            step: "02",
            phase: "Topical Cluster & Intent Architecture",
            duration: "Days 6-12",
            desc: "Mapping your target audience's high-intent commercial keywords into structured semantic clusters to prepare for total search dominance."
          },
          {
            step: "03",
            phase: "On-Page Structural Overhaul & Schema Injection",
            duration: "Days 13-20",
            desc: "Executing technical recommendations, re-structuring heading hierarchies, refining internal PageRank flow, and embedding JSON-LD schemas."
          },
          {
            step: "04",
            phase: "Authority Bridge & Ongoing Growth Sprints",
            duration: "Ongoing Monthly",
            desc: "Executing targeted digital PR outreach, monitoring search engine algorithm updates, and scaling high-converting organic keywords."
          }
        ],
        pricing: [
          {
            tier: "Growth Foundation",
            target: "Startups & Local Niche Businesses",
            price: "$499",
            priceLocal: "৳35,000",
            duration: "Monthly Sprint",
            popular: false,
            features: [
              "Complete Technical Audit & CWV Speed Fixes",
              "On-Page Optimization for up to 15 Core Pages",
              "Topical Cluster Roadmap & 4 SEO Articles",
              "Full JSON-LD Structured Data Suite",
              "Google Search Console & GA4 Attribution Setup",
              "5 High-DA Editorial Backlink Placements",
              "Monthly Rank Tracking & Performance Report"
            ]
          },
          {
            tier: "Market Dominance Suite",
            target: "Scaling Businesses & Established Brands",
            price: "$1,099",
            priceLocal: "৳75,000",
            duration: "Monthly Sprint",
            popular: true,
            features: [
              "Exhaustive Technical & Crawl Budget Optimization",
              "On-Page Optimization for up to 40 Core Pages",
              "Comprehensive Semantic Knowledge Graph Strategy",
              "10 Authority Content Cluster Sprints / Month",
              "Core Web Vitals Guarantee (Sub-1s LCP)",
              "15 High-DA Editorial Niche Backlinks / Month",
              "Dedicated Senior Technical SEO Strategist",
              "Real-Time Looker Studio Revenue Dashboard"
            ]
          },
          {
            tier: "Enterprise Authority Ecosystem",
            target: "Large E-Commerce & Global SaaS Platforms",
            price: "$2,499",
            priceLocal: "৳175,000",
            duration: "Quarterly Dedicated",
            popular: false,
            features: [
              "Unlimited Page Architecture & Log File Analysis",
              "International & Multi-Regional Hreflang Architecture",
              "Daily Search Volatility & Algorithmic Monitoring",
              "25+ Tier-1 Digital PR & High-DA Editorial Placements",
              "Custom JavaScript Rendering & Dynamic Rendering Fixes",
              "Bi-Weekly Strategy Sprints with Head of Growth",
              "Conversion Rate Optimization (CRO) Integration",
              "100% Guaranteed First-Page Keyword Commitments"
            ]
          }
        ],
        faqs: [
          {
            q: "How long does it typically take to see measurable SEO results?",
            a: "Technical fixes and Core Web Vitals optimizations often yield positive crawl and indexing signals within 2 to 3 weeks. Substantial organic ranking jumps and qualified pipeline growth typically accelerate between 60 to 90 days as topical authority compounds."
          },
          {
            q: "Do you use safe, white-hat link acquisition strategies?",
            a: "Absolutely. We strictly enforce manual digital PR outreach and high-DA editorial placements. We never use automated link farms, private blog networks (PBNs), or low-quality directories that risk manual penalties."
          },
          {
            q: "How do you protect our rankings during Google Core Algorithm Updates?",
            a: "Our entity-first framework aligns directly with Google's E-E-A-T and helpful content guidelines. By building genuine topical depth, clean technical code, and fast-loading experiences, our clients consistently gain rank during volatility periods."
          },
          {
            q: "Can you fix Core Web Vitals issues on our existing website?",
            a: "Yes. Our senior engineering team conducts code-level optimizations to compress assets, eliminate render-blocking CSS/JS, and resolve Cumulative Layout Shift (CLS) to achieve 90+ mobile and desktop PageSpeed scores."
          },
          {
            q: "Will we receive access to live rank tracking dashboards?",
            a: "Yes. Every client receives a custom Looker Studio dashboard connected directly to Google Search Console and Google Analytics 4, allowing you to track rank velocity, impressions, clicks, and conversion revenue in real time."
          }
        ]
      },
      cta: {
        badge: "Search Authority Guaranteed",
        title: "Stop Playing Catch Up. Command the First Page.",
        subtitle: "Schedule a comprehensive organic visibility session with our senior SEO architects or connect instantly on WhatsApp to review your search footprint."
      }
    }
  },

  /* ══════════════════════════════════════════════════════
     FACEBOOK & META ADS
  ══════════════════════════════════════════════════════ */
  {
    pageType: "facebook-ads",
    landing: {
      hero: {
        badge: "Performance Advertising & Paid Social",
        title: "Facebook & Meta Ads Management",
        subtitle: "Growth Engine",
        description: "We treat paid advertising as engineering, not guesswork. Our Meta ads framework leverages server-side Conversions API (CAPI), multi-stage behavioral funnels, aggressive creative sprint testing, and algorithmic budget scaling to drive profitable, predictable ROAS.",
      },
      sections: {
        metrics: [
          { label: "Target ROAS", value: "3.8x - 5.6x", desc: "Scalable return on ad spend across verified campaigns" },
          { label: "CAPI Accuracy", value: "99.8%", desc: "Server-to-server Meta Conversions API event delivery" },
          { label: "Creative Testing", value: "12+ Sprints/Mo", desc: "Continuous creative iteration and hook experimentation" },
          { label: "Tracking Parity", value: "First-Party", desc: "Zero reliance on vulnerable client-side third-party cookies" }
        ],
        pillars: [
          {
            title: "First-Party Tracking & Meta CAPI Integration",
            desc: "Bypassing browser ad-blockers and iOS privacy restrictions with robust server-to-server Conversions API (CAPI) and event deduplication.",
            icon: "Pulse",
            badge: "Tracking Core",
            highlights: [
              "Server-Side Conversions API (CAPI) Integration",
              "Event Match Quality Score > 8.5/10",
              "Advanced Deduplication & Aggregated Events",
              "First-Party Data Protection & Offline Sync"
            ]
          },
          {
            title: "Multi-Stage Behavioral Conversion Funnels",
            desc: "Architecting structured audience journeys from cold awareness to high-intent remarketing to convert prospects at the lowest customer acquisition cost (CAC).",
            icon: "Filter",
            badge: "Funnel Science",
            highlights: [
              "Top-of-Funnel (TOF) Cold Prospect Scaling",
              "Middle-of-Funnel (MOF) Consideration Nurturing",
              "Bottom-of-Funnel (BOF) High-Intent Retargeting",
              "Dynamic Product Ad (DPA) Catalog Retargeting"
            ]
          },
          {
            title: "Direct-Response Creative Sprint Testing",
            desc: "Engineering high-converting video hooks, UGC-style formats, and high-contrast static carousels systematically tested to eliminate creative fatigue.",
            icon: "Flash",
            badge: "Creative Lab",
            highlights: [
              "High-Impact 3-Second Hook Testing",
              "UGC & Direct-Response Video Frameworks",
              "Dynamic Product Showcase Carousels",
              "Psychological Angle & Headline Split-Testing"
            ]
          },
          {
            title: "Algorithmic Budget Scaling & ROAS Guards",
            desc: "Deploying Advantage+ budget optimization and rule-based safeguards to scale winning ad sets aggressively without driving up cost-per-acquisition.",
            icon: "BarChart",
            badge: "Scaling Engine",
            highlights: [
              "Advantage+ Shopping & Lead Campaign Modeling",
              "Automated Budget Scalers & Fatigue Shutoffs",
              "Bid Cap & Cost Cap Precision Controls",
              "Predictive Customer Lifetime Value (LTV) Mapping"
            ]
          }
        ],
        deliverables: [
          {
            title: "Full Meta CAPI & Pixel Technical Architecture",
            desc: "Production server-side Conversions API integration connected to your backend with event deduplication and 9.0+ match quality.",
            formats: ["CAPI Integration", "GTM Setup", "DNS Verification"]
          },
          {
            title: "Full-Funnel Campaign Architecture (TOF / MOF / BOF)",
            desc: "Meticulously organized campaign structure segmenting prospecting, consideration, and retargeting for optimal algorithmic delivery.",
            formats: ["Ad Account Blueprint", "Audience Taxonomy", "Exclusion Logic"]
          },
          {
            title: "Bespoke Direct-Response Creative Asset Suite",
            desc: "High-converting video ads, dynamic carousels, and high-contrast image variants tailored to trigger immediate click-throughs.",
            formats: ["1080x1080", "9:16 Vertical Video", "Copy Scripts"]
          },
          {
            title: "Conversion-Focused Landing Page Audit",
            desc: "Detailed audit evaluating page speed, visual hierarchy, above-the-fold value proposition, and mobile checkout friction.",
            formats: ["CRO Audit PDF", "UX Wireframes", "Checklist"]
          },
          {
            title: "Real-Time Looker Studio Live ROAS Dashboard",
            desc: "Transparent dashboard displaying real-time ROAS, CAC, CPM, CTR, and blended profitability metrics updated every hour.",
            formats: ["Looker Studio", "Live Sync", "Mobile Dashboard"]
          },
          {
            title: "Weekly Strategy & Budget Optimization Reports",
            desc: "Weekly executive summaries detailing winning creative angles, audience efficiency, and forward sprint budget recommendations.",
            formats: ["Weekly Deck", "Action Items", "Loom Video Sync"]
          }
        ],
        phases: [
          {
            step: "01",
            phase: "Account, Pixel & Meta CAPI Infrastructure Audit",
            duration: "Days 1-3",
            desc: "Auditing your existing ad account, installing server-side Meta Conversions API (CAPI), verifying domain ownership, and setting up aggregated event measurement."
          },
          {
            step: "02",
            phase: "Audience Taxonomy & Creative Sprint Development",
            duration: "Days 4-7",
            desc: "Defining high-affinity lookalike seed audiences, interest clusters, and producing the initial batch of multi-angle creative assets and copywriting."
          },
          {
            step: "03",
            phase: "Phased Campaign Launch & Algorithmic Learning",
            duration: "Days 8-14",
            desc: "Launching structured campaigns across prospecting and retargeting tiers, gathering initial conversion data, and passing the Meta learning phase."
          },
          {
            step: "04",
            phase: "Vertical Scaling & Ongoing ROAS Optimization",
            duration: "Ongoing Weekly",
            desc: "Pruning fatigued creative variants, deploying fresh sprint batches, and aggressively scaling budget into proven high-ROAS campaign clusters."
          }
        ],
        pricing: [
          {
            tier: "Growth Launch Engine",
            target: "Emerging Startups & Single-Product Brands",
            price: "$599",
            priceLocal: "৳40,000",
            duration: "Monthly Retainer",
            popular: false,
            features: [
              "Up to $5,000 / Month Ad Spend Management",
              "Server-Side Meta CAPI & Pixel Setup",
              "Full-Funnel Campaign Structure (TOF & BOF)",
              "8 Bespoke Direct-Response Ad Creatives / Month",
              "Audience Testing & Lookalike Modeling",
              "Weekly Performance Optimization Sprints",
              "Transparent Looker Studio Live Dashboard"
            ]
          },
          {
            tier: "Performance Scale Accelerator",
            target: "Established E-Commerce & Scaling Services",
            price: "$1,299",
            priceLocal: "৳90,000",
            duration: "Monthly Retainer",
            popular: true,
            features: [
              "Up to $20,000 / Month Ad Spend Management",
              "Advanced Meta CAPI with Offline Conversion Sync",
              "Comprehensive 3-Tier Funnel (TOF, MOF, BOF)",
              "16 High-Impact Creative Variants & Motion Reels / Month",
              "Dynamic Product Ad (DPA) Catalog Retargeting",
              "Advantage+ Automated Budget Scaling",
              "Dedicated Senior Performance Media Buyer",
              "Weekly Video Strategy & Creative Reviews"
            ]
          },
          {
            tier: "Enterprise Omnichannel Scaling",
            target: "High-Volume E-Commerce & Global Brands",
            price: "$2,899",
            priceLocal: "৳200,000",
            duration: "Monthly Dedicated",
            popular: false,
            features: [
              "Unlimited Ad Spend Management",
              "Custom Multi-Touch Attribution & First-Party Tracking",
              "Cross-Channel Meta & Instagram Coordinated Sprints",
              "30+ Bespoke Video Ads, UGC & Motion Graphics / Month",
              "Full Conversion Rate Optimization (CRO) Implementation",
              "Automated Budget Safeguards & Dayparting Optimization",
              "Bi-Weekly Executive Growth Review Meetings",
              "Guaranteed CAC Reduction & Target ROAS Commitments"
            ]
          }
        ],
        faqs: [
          {
            q: "What is a realistic minimum monthly ad spend to work with you?",
            a: "We generally recommend a minimum monthly ad budget of $1,000 to $1,500 (separate from management fees) to ensure the Meta algorithm has sufficient conversion volume (50+ events/week) to exit the learning phase and optimize effectively."
          },
          {
            q: "How do you solve tracking issues caused by Apple's iOS 14+ privacy changes?",
            a: "We deploy server-side Meta Conversions API (CAPI) paired with Google Tag Manager server containers and first-party event tracking. This feeds transaction data directly from your server to Meta, recovering lost attribution and maintaining high event match quality."
          },
          {
            q: "Do you design the ad graphics and videos, or do we have to provide them?",
            a: "We design and produce all direct-response static graphics, carousels, and kinetic video reels in-house as part of your monthly sprint package. If you have raw product footage or photos, we edit and optimize them for high conversion."
          },
          {
            q: "Who owns the Facebook Ad Account and creative assets?",
            a: "You retain 100% ownership of your Meta Business Manager, ad accounts, pixel data, and all produced creative assets. We manage campaigns as an authorized partner; your data remains entirely yours."
          },
          {
            q: "How often will we communicate and review campaign performance?",
            a: "You have 24/7 access to your live Looker Studio dashboard, receive written weekly optimization briefs, and attend structured bi-weekly or monthly strategy calls with your dedicated media buyer."
          }
        ]
      },
      cta: {
        badge: "Predictable ROAS Scaling",
        title: "Stop Burning Ad Spend. Scale With Predictable ROAS.",
        subtitle: "Schedule a complimentary performance marketing audit with our senior media buyers or message directly on WhatsApp to explore how we can optimize your campaigns."
      }
    }
  },

  /* ══════════════════════════════════════════════════════
     SOCIAL MEDIA CREATIVES
  ══════════════════════════════════════════════════════ */
  {
    pageType: "social-creatives",
    landing: {
      hero: {
        badge: "Scroll-Stopping Content Architecture",
        title: "Social Media Creatives & Motion Design",
        subtitle: "Visual Storytelling",
        description: "We stop the scroll with psychological precision. We engineer high-conversion carousel decks, kinetic motion reels, and brand-consistent social collateral designed to trigger algorithmic distribution and turn passive scrollers into passionate advocates.",
      },
      sections: {
        metrics: [
          { label: "Thumb-Stop Rate", value: "82%+", desc: "High scroll-stop ratio within the critical first 3 seconds" },
          { label: "Asset Volume", value: "30-60 Mo", desc: "Multi-format platform-optimized graphic & motion assets" },
          { label: "Engagement Surge", value: "+310%", desc: "Average lift in saves, shares, and qualified comments" },
          { label: "Design Token Parity", value: "100%", desc: "Strict typography, color, and voice alignment across channels" }
        ],
        pillars: [
          {
            title: "Scroll-Stopping Visual Psychology & Hooks",
            desc: "Applying high-contrast color palettes, typography hierarchy, and cognitive pattern interrupts to command instant feed attention.",
            icon: "Images",
            badge: "Attention Science",
            highlights: [
              "High-Contrast Color & Framing Hooks",
              "Cognitive Curiosity & Pattern Interrupts",
              "Platform-Native Aspect Ratio Mastery",
              "Visual Hierarchy Focused on Immediate Readability"
            ]
          },
          {
            title: "Kinetic Motion Graphics & Short-Form Video",
            desc: "High-density 9:16 vertical motion reels optimized with dynamic transitions, subtitles, and kinetic typography for maximum algorithmic watch time.",
            icon: "Film",
            badge: "Kinetic Video",
            highlights: [
              "9:16 Vertical Video for Reels, TikTok & Shorts",
              "Kinetic Typography & Dynamic Captions",
              "Frame-by-Frame Motion Pacing & Sound Sync",
              "Algorithmic Watch Time & Completion Optimization"
            ]
          },
          {
            title: "Multi-Slide Educational Carousel Architecture",
            desc: "Engineering structured multi-slide decks designed to deliver dense value, maximize swipe retention, and generate organic bookmarks and shares.",
            icon: "Layers",
            badge: "Retention Decks",
            highlights: [
              "Swipe-Intensive Multi-Slide Architecture",
              "Dense Value Delivery & Educational Formats",
              "Seamless Slide-to-Slide Panoramic Transitions",
              "Optimized for High-Value Saves & Shares"
            ]
          },
          {
            title: "Omnichannel Brand Consistency & Design Tokens",
            desc: "Maintaining an unwavering visual identity across Instagram, LinkedIn, Facebook, and X to build long-term brand equity and authority.",
            icon: "Sparkles",
            badge: "Brand Prestige",
            highlights: [
              "Unified Figma Component Libraries & Tokens",
              "Cohesive Cross-Platform Brand Recognition",
              "Executive Profile Banner & Avatar Packages",
              "Strict Typography & Color Palette Governance"
            ]
          }
        ],
        deliverables: [
          {
            title: "Monthly Static Social Graphic Suite (Feed & Stories)",
            desc: "Production-ready feed posts, stories, and quote layouts engineered to maintain prestige brand consistency across all active platforms.",
            formats: ["1080x1080", "1080x1350", "1080x1920", "PNG / WebP"]
          },
          {
            title: "High-Retention Vertical Motion Reels & Shorts",
            desc: "Professionally edited short-form videos with kinetic titles, captions, sound effects, and branded transitions ready for viral distribution.",
            formats: ["MP4 (1080x1920)", "SRT Captions", "Sound Design"]
          },
          {
            title: "High-Value Educational Carousel Packages",
            desc: "Meticulously designed swipeable carousel decks formatted for LinkedIn and Instagram with seamless panoramic visual flow.",
            formats: ["Multi-Page PDF", "Individual JPGs", "Slide Grids"]
          },
          {
            title: "Figma Social Media Component Library",
            desc: "Organized Figma component library with published styles, layout grids, avatar templates, and reusable typography tokens.",
            formats: ["Figma File", "Auto-Layout", "Design Tokens"]
          },
          {
            title: "Executive Omnichannel Profile Identity Kit",
            desc: "Matching header banners, high-resolution avatars, and story highlight covers for LinkedIn, Facebook, X, and YouTube.",
            formats: ["LinkedIn Cover", "X Banner", "Avatars", "Highlights"]
          },
          {
            title: "Strategic Monthly Content Roadmap & Copywriting",
            desc: "Complete 30-day publishing calendar with crafted copywriting, engaging hook lines, and targeted hashtag strategies.",
            formats: ["Notion Board", "Google Sheets", "Copy Doc"]
          }
        ],
        phases: [
          {
            step: "01",
            phase: "Brand Identity Audit & Visual White-Space Mapping",
            duration: "Days 1-3",
            desc: "Analyzing your current social presence, competitor visual positioning, typography guidelines, and audience engagement preferences."
          },
          {
            step: "02",
            phase: "Monthly Content Pillars & Hook Formulation",
            duration: "Days 4-7",
            desc: "Developing 4 core content pillars, brainstorming high-retention visual hooks, and drafting the monthly content production calendar."
          },
          {
            step: "03",
            phase: "High-Density Production & Motion Animation Sprints",
            duration: "Days 8-14",
            desc: "Executing static graphic designs, animating kinetic motion reels, designing carousel slides, and applying brand typography tokens."
          },
          {
            step: "04",
            phase: "Collaborative Review, Asset Handoff & Publishing",
            duration: "Monthly Cycles",
            desc: "Reviewing presentation decks in Figma or preview links, executing requested polish revisions, and packaging all final production assets."
          }
        ],
        pricing: [
          {
            tier: "Consistent Presence",
            target: "Boutique Brands & Solo Founders",
            price: "$399",
            priceLocal: "৳28,000",
            duration: "Monthly Retainer",
            popular: false,
            features: [
              "15 High-Impact Static Feed Posts & Stories",
              "2 High-Retention Motion Reels / Shorts",
              "2 Multi-Slide Educational Carousels",
              "Platform-Specific Format Resizing (IG & FB)",
              "Engaging Captions & Strategic Hashtags Included",
              "Figma Brand Template Kit Access",
              "2 Structured Revision Rounds per Month"
            ]
          },
          {
            tier: "Algorithmic Growth Engine",
            target: "Scaling Businesses & Active Brands",
            price: "$899",
            priceLocal: "৳62,000",
            duration: "Monthly Retainer",
            popular: true,
            features: [
              "30 High-Impact Static Graphics & Stories",
              "8 Dynamic Motion Reels & Shorts with Captions",
              "5 Educational Multi-Slide Carousels",
              "Omnichannel Resizing (LinkedIn, IG, FB, X)",
              "Full Copywriting & Hook Formulation",
              "Executive Profile Banner & Avatar Overhaul",
              "Dedicated Senior Motion & Graphic Designer",
              "Unlimited Minor Iterations & Priority Slack Sync"
            ]
          },
          {
            tier: "Enterprise Creative Studio",
            target: "High-Growth Brands & Conglomerates",
            price: "$1,899",
            priceLocal: "৳130,000",
            duration: "Monthly Dedicated",
            popular: false,
            features: [
              "60+ Premium Graphic Assets across all channels",
              "16 Bespoke Vertical Motion Videos & 3D Renders",
              "10 In-Depth Industry Carousels & Infographics",
              "Comprehensive Figma Component System with Auto-Layout",
              "Full Omnichannel Social Asset Kit (All Networks)",
              "Dedicated Art Director & Motion Team",
              "Same-Day Turnaround for Trending Viral Audio/Hooks",
              "Full Commercial Licensing & Source Files (.AE, .AI, .FIG)"
            ]
          }
        ],
        faqs: [
          {
            q: "Do you supply the captions and copywriting along with the designs?",
            a: "Yes. Every creative asset comes paired with persuasive, platform-tailored copywriting, engaging opening hooks, and strategic call-to-actions written by experienced direct-response UX writers."
          },
          {
            q: "Can you edit our existing video footage into vertical Reels and Shorts?",
            a: "Yes. You can share raw video footage, podcast clips, or product recordings via Google Drive or Dropbox. Our motion design team edits, color grades, and captions them into polished 9:16 viral videos."
          },
          {
            q: "What file formats will we receive for our social media assets?",
            a: "You receive high-resolution PNGs and next-gen WebPs for static graphics, 1080x1920 MP4 files with embedded subtitles for motion reels, multi-page PDFs for LinkedIn carousels, and complete Figma source files upon request."
          },
          {
            q: "How does the revision and review process work?",
            a: "We share interactive presentation decks in Figma or web previews where you can comment directly on specific frames. We implement your feedback swiftly to guarantee you are 100% delighted with every asset before publishing."
          },
          {
            q: "Do you offer scheduling and publishing services as well?",
            a: "Yes. In addition to creative asset production, we can configure and manage automated publishing across your social channels using Buffer, Hootsuite, or Meta Business Suite as an add-on service."
          }
        ]
      },
      cta: {
        badge: "Viral Visual Authority",
        title: "Stop Being Ignored. Command the Social Feed.",
        subtitle: "Schedule a free creative discovery session with our lead social art directors or message us directly on WhatsApp to elevate your brand's social presence."
      }
    }
  },

  /* ══════════════════════════════════════════════════════
     UI/UX DESIGN & PRODUCT SYSTEMS
  ══════════════════════════════════════════════════════ */
  {
    pageType: "ui-ux",
    landing: {
      hero: {
        badge: "Product Experience & System Architecture",
        title: "UI/UX Design & Product Systems",
        subtitle: "Digital Ergonomics",
        description: "We architect human experiences that convert. Combining cognitive psychology, atomic design token systems, and relentless user testing, we design web applications, mobile interfaces, and digital products that feel intuitive from the very first click.",
      },
      sections: {
        metrics: [
          { label: "Token Parity", value: "100% Code-Ready", desc: "Figma design tokens synced 1:1 with Tailwind frontend CSS" },
          { label: "Accessibility", value: "WCAG 2.2 AA", desc: "Optical contrast and keyboard accessibility compliance" },
          { label: "Prototype Fidelity", value: "Pixel Perfect", desc: "Fully interactive responsive click-through prototypes" },
          { label: "Handoff Precision", value: "Zero Ambiguity", desc: "Exhaustive component states, margins, and developer specs" }
        ],
        pillars: [
          {
            title: "User Research & Cognitive Architecture",
            desc: "Mapping user mental models, information architecture, and behavioral journeys to eliminate friction before writing a single line of code.",
            icon: "Search",
            badge: "Research Core",
            highlights: [
              "User Empathy Mapping & Personas",
              "Hierarchical Information Architecture",
              "Cognitive Load Reduction & Fitts' Law",
              "Task Flow Optimization & Wireframing"
            ]
          },
          {
            title: "Low-Fidelity Prototyping & Flow Validation",
            desc: "Validating navigation hierarchy and spatial ergonomics through interactive wireframes to test core usability without visual bias.",
            icon: "Layers",
            badge: "Structural Logic",
            highlights: [
              "Low-Fidelity Interactive Wireframes",
              "Rapid Flow & Usability Validation",
              "Edge Case & Error State Mapping",
              "Responsive Breakpoint Hierarchy"
            ]
          },
          {
            title: "Atomic Design Systems & Token Architecture",
            desc: "Building modular, enterprise-grade component libraries in Figma using Auto Layout 5.0, variables, and code-aligned design tokens.",
            icon: "Flash",
            badge: "Atomic Scale",
            highlights: [
              "Atomic Component Libraries in Figma",
              "Design Tokens for Colors, Type & Spacing",
              "Auto Layout 5.0 Responsive Precision",
              "Light and Dark Mode Semantic Variables"
            ]
          },
          {
            title: "Interactive Prototypes & Developer Handoff",
            desc: "High-fidelity micro-interactions and comprehensive handoff specs with exported CSS tokens, eliminating developer guesswork.",
            icon: "CodeSlash",
            badge: "Engineering Sync",
            highlights: [
              "High-Fidelity Interactive Click-Throughs",
              "Exhaustive Hover, Focus & Disabled States",
              "Design Token JSON Export for Frontend",
              "WCAG 2.2 AA Accessibility Validation"
            ]
          }
        ],
        deliverables: [
          {
            title: "Enterprise Figma Component Library & Token Suite",
            desc: "Modular design system built with Auto Layout 5.0, published typography styles, color variables, and comprehensive state variants.",
            formats: ["Figma .FIG", "Design Tokens JSON", "CSS Variables"]
          },
          {
            title: "High-Fidelity Responsive Interactive Prototypes",
            desc: "Click-through prototypes demonstrating real user flows, micro-interactions, modal behaviors, and responsive navigation across all breakpoints.",
            formats: ["Figma Prototype", "Mobile & Desktop", "Flow Maps"]
          },
          {
            title: "User Journey Maps & Low-Fi Wireframe Specs",
            desc: "Detailed architectural documentation outlining user personas, task flows, heuristic audits, and structural wireframe layouts.",
            formats: ["User Journey PDF", "Wireframe Kit", "Flow Diagrams"]
          },
          {
            title: "Comprehensive Developer Handoff Documentation",
            desc: "Precise engineering specs documenting spacing scales, component prop variants, animation curves, and responsive breakpoint rules.",
            formats: ["Developer Handoff", "Specs Guide", "Inspection Notes"]
          },
          {
            title: "WCAG 2.2 AA Accessibility Compliance Report",
            desc: "Formal audit certifying optical contrast ratios, screen reader accessibility, keyboard focus states, and tap target dimensions.",
            formats: ["Accessibility Audit", "Contrast Matrix", "Checklist"]
          },
          {
            title: "Light & Dark Mode Interface Schemas",
            desc: "Complete visual parity across light and dark operating systems with semantic tokens and contrast-optimized surfaces.",
            formats: ["Light Schema", "Dark Schema", "Color System"]
          }
        ],
        phases: [
          {
            step: "01",
            phase: "Heuristic Audit & Cognitive Research",
            duration: "Days 1-5",
            desc: "Auditing existing interfaces against usability benchmarks, mapping customer friction points, and establishing user persona journeys."
          },
          {
            step: "02",
            phase: "Information Architecture & Wireframe Prototyping",
            duration: "Days 6-12",
            desc: "Structuring application navigation hierarchies, defining screen layouts, and prototyping clickable low-fidelity wireframes."
          },
          {
            step: "03",
            phase: "Atomic Design System & High-Fidelity UI Craft",
            duration: "Days 13-22",
            desc: "Applying brand visual identity, typography scales, and color variables to create pixel-perfect screens and reusable Figma components."
          },
          {
            step: "04",
            phase: "Interactive Micro-Interactions & Engineering Handoff",
            duration: "Days 23-30",
            desc: "Fine-tuning interactive transitions, validating WCAG 2.2 AA accessibility, and exporting design tokens and implementation manifests for developers."
          }
        ],
        pricing: [
          {
            tier: "MVP Prototype Sprint",
            target: "Startups & Validating New Products",
            price: "$799",
            priceLocal: "৳55,000",
            duration: "7-10 Business Days",
            popular: false,
            features: [
              "Up to 8 Core Responsive Screens (Desktop & Mobile)",
              "User Flow & Information Architecture Mapping",
              "Low-Fidelity Wireframes & Feedback Iterations",
              "High-Fidelity Pixel-Perfect Visual UI Design",
              "Interactive Click-Through Prototype in Figma",
              "Basic Component Library & Color/Type Tokens",
              "Full Figma Source File Ownership & Export"
            ]
          },
          {
            tier: "Full Product Suite",
            target: "Scaling SaaS, Apps & High-Conversion Portals",
            price: "$1,899",
            priceLocal: "৳130,000",
            duration: "14-21 Business Days",
            popular: true,
            features: [
              "Up to 25 Core Responsive Screens across all viewports",
              "Exhaustive User Research & Heuristic Usability Audit",
              "Complete Atomic Design System with Auto Layout 5.0",
              "Light & Dark Mode UI Schemas",
              "Advanced Interactive Micro-Interactions & Transitions",
              "WCAG 2.2 AA Accessibility Compliance Audit",
              "Developer Handoff JSON Tokens & CSS Variables",
              "Dedicated Senior UI/UX Lead Consultation Sprints"
            ]
          },
          {
            tier: "Enterprise Design System & Platform",
            target: "Conglomerates, Multi-Tenant Platforms & Ecosystems",
            price: "$3,999",
            priceLocal: "৳280,000",
            duration: "30-45 Business Days",
            popular: false,
            features: [
              "Unlimited Complex Screen Workflows & Edge Cases",
              "Multi-Role Permission & Dashboard UI Architecture",
              "Full Enterprise Design Token System Synced with Git",
              "Custom Bespoke Iconography Suite (40+ Icons)",
              "Live User Testing & Heuristic Video Walkthroughs",
              "Design-to-Code Technical Review with Engineering Team",
              "Comprehensive 80+ Page Interactive Design Bible",
              "6 Months Post-Handoff Design Support & Iteration Guarantee"
            ]
          }
        ],
        faqs: [
          {
            q: "What design tools do you use for UI/UX projects?",
            a: "We work primarily in Figma using modern enterprise best practices: Auto Layout 5.0, component variants, interactive component states, and variables for design tokens. All files are organized for seamless developer inspection."
          },
          {
            q: "How do you ensure developers can easily implement your designs?",
            a: "We provide comprehensive developer specs in Figma, including exact padding, typography scales, responsive constraint rules, and exported JSON token files for Tailwind CSS or CSS variables to eliminate implementation guesswork."
          },
          {
            q: "Do you design for both mobile and desktop screen sizes?",
            a: "Yes. Every interface is designed responsively across standard desktop (1440px), tablet (768px), and mobile (375px/390px) breakpoints with native touch targets (min 44px) and adaptive layouts."
          },
          {
            q: "Can you redesign an existing live software application without breaking current workflows?",
            a: "Yes. We start with a heuristic audit to identify friction points while preserving familiar mental models for your existing users, ensuring the redesign enhances usability without disrupting current adoption."
          },
          {
            q: "Are the designs accessible according to WCAG standards?",
            a: "Yes. All our high-fidelity color combinations, text hierarchies, and interactive states are tested against WCAG 2.2 AA standards for optical contrast, screen reader compatibility, and clear keyboard focus states."
          }
        ]
      },
      cta: {
        badge: "Human-Centered Excellence",
        title: "Eliminate Friction. Architect an Unforgettable Product Experience.",
        subtitle: "Schedule a free product design discovery session with our senior UI/UX architects or message us on WhatsApp to discuss your interface architecture."
      }
    }
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("Connected to MongoDB");

    for (const item of enrichedServices) {
      const res = await WebServiceContent.findOneAndUpdate(
        { pageType: item.pageType },
        { $set: item },
        { upsert: true, new: true }
      );
      console.log(`Upserted ${item.pageType}:`, res.pageType, "Hero:", res.landing?.hero?.title);
    }

    console.log("All 4 services successfully seeded into MongoDB!");
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seed();
