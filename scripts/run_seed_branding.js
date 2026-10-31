const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
require("dotenv").config();
const WebServiceContent = require("../src/models/WebServiceContent");

const brandingItem = {
  pageType: "branding",
  landing: {
    hero: {
      badge: "Strategic Visual Identity & Logo Architecture",
      title: "Logo & Brand Identity",
      subtitle: "Architecture",
      description:
        "We don't merely draw logos. We construct mathematically grounded, high-fidelity brand ecosystems that command market authority, foster instant credibility, and scale flawlessly across digital and physical touchpoints.",
    },
    sections: {
      metrics: [
        { label: "Vector Precision", value: "100%", desc: "Infinitely scalable SVG, AI & EPS masters" },
        { label: "Color Calibration", value: "ΔE < 2.0", desc: "Cross-medium digital & print parity" },
        { label: "Turnaround Sprints", value: "7-14 Days", desc: "Structured 4-phase creative sprints" },
        { label: "IP Rights", value: "Full Transfer", desc: "100% commercial copyright ownership" },
      ],
      pillars: [
        {
          id: "geometry",
          title: "Mathematical Geometry & Mark Construction",
          desc: "Constructed using the golden ratio (1.618), optical alignment grids, and negative-space balance. Designed to remain pristine whether scaled to a 16px favicon or a 12-meter billboard.",
          icon: "grid",
          badge: "Structure",
          highlights: [
            "Golden Ratio & Isometric Grids",
            "Sub-16px Favicon Legibility",
            "Primary, Secondary & Monogram Variations",
            "Clearance & Exclusion Zone Rules",
          ],
        },
        {
          id: "chromodynamics",
          title: "Chromodynamic Multi-Space Color Calibration",
          desc: "Precise multi-channel palette mapping across HEX (web), RGB (displays), CMYK (offset print), and Pantone matching to prevent inconsistent color reproduction across platforms.",
          icon: "palette",
          badge: "Color Science",
          highlights: [
            "Calibrated HEX, RGB & CMYK Scales",
            "WCAG 2.2 AA Contrast Compliance",
            "Light & Dark Surface Adaptability",
            "Emotional Resonance Mapping",
          ],
        },
        {
          id: "typography",
          title: "Typographic Voice & Hierarchy Architecture",
          desc: "Curating and engineering primary display typefaces paired with high-legibility body systems. Establishing strict responsive typographic scales for UI, editorial, and collateral.",
          icon: "text",
          badge: "Hierarchy",
          highlights: [
            "Display & Body Typeface Pairing",
            "Fluid Scaling & Line-Height Standards",
            "Web & Desktop Commercial Licensing",
            "Tabular & Monospace System Logic",
          ],
        },
        {
          id: "manual",
          title: "Enterprise Brand Guidelines & Asset System",
          desc: "An exhaustive 40+ page operational brand manual that protects your identity against dilution across global teams, external partners, and third-party vendors.",
          icon: "manual",
          badge: "Governance",
          highlights: [
            "40+ Page Definitive Brand Manual",
            "Prohibited Logo Usage & Misuse Rules",
            "Figma Component Tokens & Styles",
            "Corporate Stationery & Collateral Specs",
          ],
        },
      ],
      anatomy: {
        goldenRatio: "1.61803",
        symmetryRatio: "1:1.618",
        kerningAudit: "Optical Kerning Verified",
        colors: [
          { name: "Smart Pink", hex: "#FF2C6D", rgb: "255, 44, 109", cmyk: "0, 83, 57, 0", role: "Primary Accent & CTA" },
          { name: "Emerald Growth", hex: "#10B981", rgb: "16, 185, 129", cmyk: "86, 0, 30, 27", role: "Secondary & Trust" },
          { name: "Obsidian Slate", hex: "#0F172A", rgb: "15, 23, 42", cmyk: "64, 45, 0, 84", role: "Headings & Contrast" },
          { name: "Pure Canvas", hex: "#FFFFFF", rgb: "255, 255, 255", cmyk: "0, 0, 0, 0", role: "Card Surface / Light" },
        ],
        contrastRatio: "11.4:1 (AAA Pass)",
        typography: {
          display: { role: "DISPLAY / HEADINGS", font: "Outfit ExtraBold 800", sample: "Distinctive Authority" },
          body: { role: "BODY & EDITORIAL", font: "Inter Regular 400", sample: "Engineered for high readability across 14-inch retina displays and printed documents." },
          code: { role: "CODE & SPECIFICATION", font: "JetBrains Mono 500", sample: "font-feature-settings: 'cv02', 'cv03', 'cv04';" },
        },
        mockup: {
          brandName: "SMART YOUTH ICT",
          edition: "Corporate Edition",
          badge: "VERIFIED_ASSET",
          author: "Lead Brand Architect",
          assetTitle: "Executive Stationery Kit",
          tag: "2026 // SYICT",
          finishes: ["Matte Velvet Finish", "Spot UV Foil Emboss"],
        },
      },
      workbench: {
        badge: "System Integrity & Asset Governance",
        title: "An Airtight Brand Manual for Flawless Worldwide Scaling",
        description:
          "Consistency builds brand equity; ambiguity destroys it. We supply an exhaustive, battle-tested brand guidelines document that specifies every margin, exclusion boundary, color translation, and typography rule. Your internal teams and external design agencies will never have to guess.",
        standards: [
          { title: "Exclusion Zones", desc: "Strict minimum clearance boundaries preventing logo distortion or crowding." },
          { title: "Multi-Space Calibration", desc: "Guaranteed color parity across digital screens, offset printing, and physical fabrics." },
          { title: "Asset Formats Matrix", desc: "Handed-over vector masters, screen PNGs, favicons, and scalable WebP bundles." },
          { title: "Tone of Voice Syntax", desc: "Comprehensive copywriting rules that align verbal identity with visual design." },
        ],
        safeZone: {
          clearSpace: "x = 24px (Clear Space)",
          minWidth: "min-w: 120px",
          brandText: "SMART YOUTH ICT",
          subText: "Brand Identity Standard",
          caption: "Protected by strict optical margin clearance on all 4 quadrants",
        },
        compliance: {
          deltaE: "DELTA-E < 1.8",
          release: "SYICT Brand Manual Specification // Release v2.6",
          status: "Ready for Worldwide Production",
        },
      },
      deliverables: [
        {
          title: "Master Vector Source Files",
          desc: "Industry-standard vector source files (.AI, .EPS, .SVG, and high-fidelity vector .PDF) prepared for infinite resolution scaling.",
          formats: [".AI", ".EPS", ".SVG", ".PDF"],
        },
        {
          title: "Digital Screen Asset Suite",
          desc: "Exported transparent PNGs across @1x, @2x, @3x resolutions, next-gen WebP assets, and responsive app favicon bundles.",
          formats: ["PNG @3x", "WebP", "Favicon Kit", "App Icons"],
        },
        {
          title: "Definitive Brand Manual (PDF)",
          desc: "Comprehensive 40+ page guide detailing logo clearance, typography pairing rules, color codes, and brand tone of voice.",
          formats: ["40+ Pages", "Print Ready", "Interactive PDF", "Web Guide"],
        },
        {
          title: "Corporate Stationery Package",
          desc: "Ready-to-print luxury business card layouts, corporate letterhead, envelope designs, invoice headers, and email signature HTML.",
          formats: ["Business Cards", "Letterhead", "Envelopes", "Email HTML"],
        },
        {
          title: "Social Media Launch Kit",
          desc: "High-impact avatar badges, profile banners, story templates, and post layout grids optimized for LinkedIn, Facebook, X, and Instagram.",
          formats: ["LinkedIn", "Facebook", "X / Twitter", "Instagram"],
        },
        {
          title: "Figma & Developer Tokens",
          desc: "Organized Figma component library with published color tokens, typographic text styles, and exported CSS/Tailwind variables.",
          formats: ["Figma Styles", "CSS Variables", "Tailwind Config", "JSON Tokens"],
        },
      ],
      phases: [
        {
          step: "01",
          phase: "Strategic Discovery & Archetype",
          duration: "Days 1-3",
          desc: "Deep-dive audit into your industry landscape, competitive visual whitespace, customer psychology, and core brand personality attributes.",
        },
        {
          step: "02",
          phase: "Geometric Construction & Concept Sprints",
          duration: "Days 4-7",
          desc: "Translating brand strategy into 3 distinct mathematical logo directions built on precise geometric grids and optical balance principles.",
        },
        {
          step: "03",
          phase: "Color Science & System Refinement",
          duration: "Days 8-10",
          desc: "Collaborative feedback sprint to fine-tune the chosen concept, formulate multi-channel color palettes, and engineer typography pairings.",
        },
        {
          step: "04",
          phase: "Master Brand Book & Asset Handoff",
          duration: "Days 11-14",
          desc: "Compiling the definitive 40+ page Brand Manual, packaging all production-ready vector assets, and executing 100% copyright assignment.",
        },
      ],
      pricing: [
        {
          tier: "Identity Foundation",
          target: "Early-Stage Startups & Modern Ventures",
          price: "$499",
          priceLocal: "৳35,000",
          duration: "5-7 Business Days",
          popular: false,
          features: [
            "2 Distinct Mathematical Logo Directions",
            "Primary & Secondary Logo Lockups",
            "Vector Source Kit (.AI, .EPS, .SVG, .PDF)",
            "Curated 4-Color Palette System (HEX & RGB)",
            "Primary & Secondary Typography Pairing",
            "15-Page Essential Brand Style Guide",
            "100% Commercial Copyright Transfer",
          ],
        },
        {
          tier: "Corporate Brand Suite",
          target: "Growing Companies & Established SMEs",
          price: "$1,199",
          priceLocal: "৳85,000",
          duration: "8-12 Business Days",
          popular: true,
          features: [
            "4 Comprehensive Strategic Logo Directions",
            "Full Monogram, Wordmark & Badge Variations",
            "Complete Vector & High-Res Screen Assets (@3x)",
            "Chromodynamic Multi-Space Color Calibration (HEX, RGB, CMYK)",
            "Complete Typographic Scale & Editorial Hierarchy",
            "Print Stationery Suite (Cards, Letterhead, Envelopes)",
            "Full Social Media Avatar & Banner Package",
            "Exhaustive 40-Page Interactive Brand Manual",
            "Figma Design Token File & CSS Variables",
            "Dedicated Senior Design Director Consultation",
          ],
        },
        {
          tier: "Enterprise Brand Ecosystem",
          target: "Conglomerates, Multi-Product & Global Brands",
          price: "$2,799",
          priceLocal: "৳195,000",
          duration: "14-21 Business Days",
          popular: false,
          features: [
            "Unlimited Iterative Design Sprints",
            "Multi-Tier Sub-Brand & Parent Brand Architecture",
            "Custom Bespoke Iconography System (24 Icons)",
            "Motion Design Logo Guidelines (Lottie / After Effects)",
            "Full Packaging & Merchandising Collateral System",
            "Comprehensive 60+ Page Global Brand Bible",
            "Complete Figma Component Library with Auto-Layout",
            "Staff & Vendor Brand Training Session (Remote)",
            "12-Month Asset Archival & Re-Export Guarantee",
          ],
        },
      ],
      faqs: [
        {
          q: "Who owns the intellectual property and copyright after delivery?",
          a: "You retain 100% exclusive, worldwide commercial copyright and intellectual property rights once the final milestone is delivered. We provide a signed Certificate of Copyright Assignment with your final asset package.",
        },
        {
          q: "What file formats will I receive in the final handoff?",
          a: "You receive industry-standard vector master files (.AI, .EPS, .SVG, vector .PDF) suitable for infinite resolution scaling, alongside high-resolution transparent PNGs (@1x, @2x, @3x), web-optimized WebPs, and ready-to-use favicon bundles.",
        },
        {
          q: "Can you modernize or refresh an existing logo without losing our established equity?",
          a: "Yes. Many of our corporate clients come to us for brand revitalizations. We conduct an equity audit to retain your core recognizable elements while correcting geometric imbalances, optical kerning, and color vibrancy for modern high-DPI screens.",
        },
        {
          q: "How do you guarantee that our brand colors look identical in print and on screen?",
          a: "We calibrate colors across multiple color spaces—HEX and RGB for screens, CMYK for offset printing, and Pantone (PMS) references for spot-color precision. We test for Delta-E variance (< 2.0) to eliminate color drift between print collaterals and web UIs.",
        },
        {
          q: "How does the revision and feedback process work?",
          a: "Each project includes structured feedback milestones at the concept, color, and guideline phases. You review interactive presentation decks in Figma or web preview, provide structured notes, and our design team refines the directions until you are completely satisfied.",
        },
      ],
    },
    cta: {
      badge: "Guaranteed Creative Excellence",
      title: "Build a Brand That Commands Absolute Trust.",
      subtitle:
        "Schedule a free discovery session with our senior brand architects or chat instantly on WhatsApp to discuss your positioning, visual direction, and project timeline.",
    },
  },
  details: {
    hero: {
      badge: "Technical Identity Specifications",
      title: "Identity Architecture",
      description:
        "A comprehensive technical breakdown of our mathematical logo construction, multi-space color formulation, and enterprise brand governance protocols.",
    },
    sections: {
      phases: [
        { step: "01", stage: "Syntactic Research", action: "Analyzing market linguistics and defining the brand's unique semantic hooks." },
        { step: "02", stage: "Geometric Baseline", action: "Setting up mathematical grids and Fibonacci ratios for structural balance." },
        { step: "03", stage: "Core Construction", action: "Iterative sketching and vector refining of the primary mark." },
        { step: "04", stage: "Chromodynamic Mapping", action: "Synthesizing color palettes based on emotional delta and accessibility." },
        { step: "05", stage: "Voice & Tone Logic", action: "Engineering the copywriting syntax and communication manifest." },
        { step: "06", stage: "Governance Manual", action: "Documenting usage limits, spacing, and scaling protocols for global growth." },
      ],
      roi: [
        { group: "Visual Grammar", items: ["Grid-Based Logic", "Exclusion Zones", "Golden Ratio Scaling", "Adaptive Systems"] },
        { group: "Color Science", items: ["Emotion Mapping", "Delta-E Compliance", "WCAG AA Contrast", "Sub-Brand Palettes"] },
        { group: "Authority Tier", items: ["Corporate Tone Guide", "Typeface Licensing", "Iconography Logic", "Motion DNA"] },
      ],
      manifest: [
        { i: "Palette", t: "Delta-E Compliance", d: "Ensuring color consistency across all digital/print outputs." },
        { i: "Terminal", t: "HEX/RGB Logic", d: "Standardized code handoffs for digital implementation." },
        { i: "HardwareChip", t: "Print Precision", d: "Pantone & CMYK mapping for material assets." },
      ],
    },
    cta: { title: "Ready to activate your Distinctive Identity?" },
  },
};

async function seedBranding() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("Connected to MongoDB...");

    const updated = await WebServiceContent.findOneAndUpdate(
      { pageType: "branding" },
      brandingItem,
      { upsert: true, new: true, runValidators: false }
    );

    console.log("Successfully seeded branding to MongoDB:", updated.pageType);
    console.log("Pillars count:", updated.landing?.sections?.pillars?.length);
    console.log("Metrics count:", updated.landing?.sections?.metrics?.length);
    console.log("Deliverables count:", updated.landing?.sections?.deliverables?.length);
    console.log("Phases count:", updated.landing?.sections?.phases?.length);
    console.log("Pricing count:", updated.landing?.sections?.pricing?.length);
    console.log("FAQs count:", updated.landing?.sections?.faqs?.length);

    await mongoose.disconnect();
    console.log("Database injection complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seedBranding();
