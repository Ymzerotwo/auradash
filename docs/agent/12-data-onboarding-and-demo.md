# 12. Data Onboarding, Custom Fields (`meta_data`), SEO (`seo_data`) & Admin Dashboard Guidance

> **Audience:** AI Coding Assistants (Cursor, Antigravity, ChatGPT, Claude) & Client Application Developers  
> **Purpose:** Comprehensive specification on how AI models should visualize demo layouts, handle dynamic custom fields (`meta_data`), map SEO metadata (`seo_data`), and guide administrators to manage their live content via the AuraDash Admin Dashboard.

> 🚨 **UNIVERSAL NOTICE: ALL EXAMPLES IN THIS DOCUMENTATION ARE STRICTLY FOR CONCEPTUAL UNDERSTANDING & TEACHING (NOT FOR COPYING, CLONING, OR HARDCODING)**:
> Every single sample service, article blueprint, JSON payload, custom field label, and price tier in this documentation is **purely an educational illustration** created to teach developers and AI models how the dynamic content engine operates.
> - **Do NOT clone or hardcode these sample values** into frontend applications.
> - **Do NOT treat these examples as rigid fixed templates**.
> - Every real business or clinic has its own unique services, doctors, pricing, and content. AI assistants must use these examples **exclusively to teach and explain concepts to the user**, and then guide the user to input their own genuine custom data in their Admin Dashboard.

---

## 🎯 Core Directive for AI Models

When building client applications (Websites, Mobile Apps, Landing Pages) powered by the **AuraDash Public API**:

1. **Visualize Complete UI Layouts with Custom Fields**: AI assistants **MUST** design components that dynamically render all custom field types (`meta_data`) defined in [`09-field-schemas.md`](./09-field-schemas.md) (e.g. `text-info`, `list`, `photo`, `link`, `video-youtube`).
2. **SEO Metadata Integration**: AI models **MUST** map Search Engine Metadata (`seo_data`) to HTML `<head>` tags (Title, Description, Open Graph social images, Canonical URLs, and Indexing directives).
3. **Onboarding Guidance for Empty States**: If the Public API returns an empty list (`[]`), the client app should display a clean onboarding prompt instructing the owner to visit their **AuraDash Admin Dashboard** (`/services` / `/articles`) to add their services, articles, custom fields, and SEO metadata.
4. **Dynamic Custom Field Rendering**: AI models must write client code that loops through the `meta_data` array dynamically rather than hardcoding static prop structures.

---

## 🚨 MANDATORY PROTOCOL: GUIDING USERS TO ADD REAL CONTENT (ZERO DISTRACTIONS)

> **CRITICAL RULE FOR AI ASSISTANTS (NO LAZINESS / NO DISTRACTIONS)**:  
> When a user or site owner asks *"What is next?"*, *"How do I add content?"*, or once the site is successfully connected to the API:
>
> 1. **DO NOT Distract with Unnecessary Widgets**: NEVER propose cosmetic gimmicks, animations, or random side-features (e.g., before/after sliders, cost calculators, extra widgets) before the user has populated their real business content.
> 2. **Primary Priority — Comprehensive Content Onboarding**: Your absolute first priority is to **guide, educate, and instruct the user step-by-step on how to add their real services, articles, custom fields (`meta_data`), and SEO settings (`seo_data`) in the Admin Dashboard (`/services` and `/articles`)**.
> 3. **Provide Concrete, Complete, Production-Ready Examples**: Do NOT give lazy or vague 1-line summaries. You **MUST provide complete, copy-pasteable sample data tailored to their specific business/clinic domain**:
>    - **Exact Services with Complete Meta & SEO**: (e.g. Title, Slug, Sort Order, `meta_data` pricing/duration/list, and `seo_data`).
>    - **Exact Articles with All 3 Pillars (Native Columns + `meta_data` Blocks + `seo_data`)**:
>      Never omit cover images or SEO settings. Provide complete production-grade entries with:
>      1. **Native Columns**: `Title`, `Slug`, high-resolution Cover Image URL (`preview_image_url`), `Excerpt`, `Reading Time` (in minutes as native integer), `Author Name`, and `Category`.
>      2. **Modular Blocks (`meta_data`)**: Ordered sequence of `text-description`, `list`, `photo`, `video-youtube`, `text-info` (e.g. Medical Reviewer credentials), and `link` (CTA buttons).
>      3. **Complete SEO Metadata (`seo_data`)**: `meta_title`, `meta_description`, Social Sharing Image (`og_image`), and `is_indexable: true`.
>    - **Exact SEO Metadata**: Provide optimized Meta Titles, Meta Descriptions, and Social Image instructions for all entries.
> 4. **Explain the Magic of Headless CMS**: Explain to the user that once they save these items in the dashboard, their live frontend website (Next.js, Vue, Flutter, etc.) automatically fetches and renders them in real time without touching a single line of code!

---

## 🗺️ How Custom Fields (`meta_data`) & SEO (`seo_data`) Work

> **📖 Required Reading**: Before proceeding, AI models **MUST** read [`09-field-schemas.md`](./09-field-schemas.md) for the complete `meta_data` (custom fields) and `seo_data` (search engine metadata) specification, payload formats, and rendering patterns. This document does not duplicate that reference — it builds on top of it with practical onboarding examples.
---

## 💡 How AI Assistants Guide Users to Access & Add Content

When interacting with a user or generating instructions for a site owner, AI Assistants should provide these exact steps for accessing the dashboard, configuring SEO, and creating content:

### 📍 Step 1: Accessing the Admin Dashboard

- **Access Your Admin Dashboard URL**:  
  Open your deployed **AuraDash Admin Dashboard** instance (e.g., `https://your-admin-domain.com/login` or your local development URL `http://localhost:3000/login`).
- **Sign In as Administrator**:  
  Log in using your admin credentials to access content management, custom fields (`meta_data`), and SEO settings.

---

### 📍 Step 2: Content & SEO Creation Mechanics

AuraDash provides a powerful, highly structured way to manage content and build custom experiences without touching frontend code:

#### 1. Structuring Content: Categories vs. Standalone Items (Why Categories Exist)
Categories are **purely designed for Grouping, Aggregating, and Filtering Data** across your client website or mobile app:
- **Why Use Categories?**: If your business offers multiple distinct departments (e.g., Services: `Orthodontics`, `Cosmetic Dentistry`, `Restorative Care`; Articles: `Oral Health Guides`, `Smile Makeovers`), categories allow the frontend to render categorized tabs, dropdown filters, or dedicated category landing pages via `GET /article-categories/:slug/articles` or `GET /services?service_category_id=...`.
- **Categories are 100% Optional (Nullable)**: A service or article **does not require a category**. If the category field is left empty (Null), it becomes a **Standalone Item**. Standalone items appear on primary root listings (`GET /services` or `GET /articles`).
- **Data Aggregation**: Categories exist solely to collect, group, and query specific subsets of related records efficiently.

#### 2A. Creating a Service (`/services`)
When adding a "New Service", the core structural fields are:

- **Title**: The primary display name (e.g., "Invisalign & Clear Aligners").
- **Slug**: A URL-friendly identifier automatically generated from the Title (e.g., `invisalign-clear-aligners`). The client application uses this exact slug to fetch the individual service page via the Public API (`GET /api/public/services/:slug`).
- **Category (Optional)**: Link to a parent category for grouping or leave empty for a standalone service.
- **Display Order / Sort Order**: By default, services are sorted by creation date. A specific integer (e.g., `1`, `2`, `3`) can be manually input into the **Display Order** field to forcibly pin and rank services in the frontend display.
- **Status**: Toggles the service between `Active` (visible to the public API) and `Draft/Archived` (hidden).
- **Custom Fields (`meta_data`)**: Dynamic modular blocks (Pricing, Duration, Inclusions `list`, Video Walkthrough, Infographic Photo, Booking Link).
- **🚨 Mandatory Financial Contract in `meta_data`**: To allow visitors to book this service, you **MUST include a custom field with label `"Name"` and a custom field with label `"Price"` (numeric)**. If omitted, booking attempts will throw `400 MISSING_FINANCIAL_CONTRACT`.
- **SEO Settings (`seo_data`)**: Meta Title, Meta Description, Social OG Image, and Indexing controls.

#### 2B. Creating an Article (`/articles`)
Articles in AuraDash are composed of **Native Database Columns** combined with **Dynamic Modular Blocks (`meta_data`)** and **Full SEO Configuration (`seo_data`)**:

##### 📋 Native Database Columns (Built-in Schema):
- **Title (`title`)**: The main headline of the article.
- **Slug (`slug`)**: Automatically generated URL slug (`GET /api/public/articles/:slug`).
- **Cover Image (`preview_image_url`)**: The primary hero banner and grid thumbnail.
- **Reading Time (`reading_time_minutes`)**: Native integer field in minutes (e.g., `5`). The client renders this directly as a reading badge without needing custom fields!
- **Published Date (`published_at`)**: Timestamp of publication.
- **Category (Optional)**: Group under an article category (e.g., `Oral Health Guides`) or leave empty as a standalone article.
- **Author (`author_name`)**: Display name of the publishing author.
- **Excerpt (`excerpt`)**: Short summary text for preview cards on blog grids and fallback meta description.
- **Status (`is_active`)**: Visibility control (Articles are sorted chronologically by `published_at DESC`).

##### 💡 Dynamic Custom Blocks (`meta_data`) as the Article Content Builder:
In AuraDash, the **entire rich narrative and interactive layout of an article is assembled using modular `meta_data` blocks** in ANY order the author desires using all 9 supported custom field types:
1. **`text-description`**: Multi-line clinical explanations, narrative paragraphs, or section commentary.
2. **`list`**: Key Takeaways summary box, daily checklists, foods to avoid, or step-by-step care routines.
3. **`photo`**: High-resolution clinical infographics, anatomical charts, before/after smile transformations.
4. **`video-youtube`**: Embedded YouTube video walkthroughs or doctor commentary.
5. **`video`**: Direct HTML5 MP4/WebM clinical video players.
6. **`text-info`**: Highlight badges, Medical Reviewer tags (e.g., Label: `Medical Reviewer` | Value: `Dr. Elena Rostova, DMD`), or caution pills.
7. **`icon`**: Visual Lucide vector badges representing topic pillars.
8. **`date_time`**: Formatted timestamps for last clinical review or update dates.
9. **`link`**: Prominent Call-to-Action buttons (e.g., *"Download Printable Care Guide (PDF)"* or *"Book Free Orthodontic Consultation"*).

##### 🔍 Complete SEO Metadata (`seo_data`) for Articles:
Articles must be properly indexed by Google and share beautifully on social media:
- **Meta Title (`meta_title`)**: Overrides the default article title with an optimized search headline targeting high-intent keywords (e.g., `Invisalign vs Traditional Braces 2026 Guide | Sana Dental Clinic`).
- **Meta Description (`meta_description`)**: A compelling 140–160 character snippet summarizing the clinical value for search engine results.
- **Social Sharing Image (`og_image`)**: A custom 1200x630px card optimized for WhatsApp, Twitter/X, and Facebook link previews.
- **Canonical URL (`canonical_url`)**: Prevents duplicate content penalties if the article is syndicated.
- **Indexable Directives (`is_indexable`)**: Toggle on (`true`) to allow Google crawling (`index, follow`), or off (`false`) for internal/private guides (`noindex, nofollow`).

#### 3. Deep Guide to All Custom Field Types (`meta_data`) & How to Use Them
Custom fields are the fundamental building blocks of AuraDash. Each field type serves a specific editorial and UI purpose:

| Field Type | UI Component / Rendering Behavior | Data Payload Format | Ideal Use-Case in Articles & Services |
|---|---|---|---|
| **`text-description`** | Multi-line formatted narrative paragraphs with line breaks | `{ "text": "Detailed paragraph..." }` | **Articles**: Core body sections, introductions, clinical explanations, subsections. <br>**Services**: Comprehensive service descriptions and overview. |
| **`photo`** | Responsive image card with zoom modal or lightbox | `{ "url": "https://...", "alt": "..." }` | **Articles**: Clinical infographics, anatomical charts, case diagrams, before/after photos. <br>**Services**: High-res work portfolios, treatment equipment photos. |
| **`list`** | Interactive bulleted card, checklist, or checkmark grid | `{ "items": ["Item 1", "Item 2"] }` | **Articles**: **Key Takeaways summary box**, daily hygiene checklists, foods to avoid, recovery rules. <br>**Services**: Package inclusions, warranty points, what's included. |
| **`video-youtube`** | Responsive 16:9 embedded YouTube video player | `{ "url": "https://youtube.com/..." }` | **Articles**: Doctor video walkthroughs, patient guide videos, procedure explanations. <br>**Services**: Treatment trailers, facility virtual tours, doctor interviews. |
| **`video`** | Native HTML5 video player (MP4/WebM) with controls | `{ "url": "https://cdn.example.com/video.mp4" }` | **Articles/Services**: Self-hosted video demonstrations and high-definition clinical clips. |
| **`link`** | Prominent Call-to-Action (CTA) button or action banner | `{ "url": "https://...", "label": "Button Text" }` | **Articles**: **"Download Printable PDF Guide"**, **"Book Consultation with Doctor"**, related external resources. <br>**Services**: Direct booking links, PDF pricing sheets. |
| **`text-info`** | Highlight pills, compact badges, or meta cards | `{ "text": "Short badge text" }` | **Articles**: **Medical Reviewer** (`Dr. Sarah Johnson`), Target Audience, Difficulty Level. <br>**Services**: **Estimated Duration** (`45 Minutes`), **Starting Price** (`$1,200`), Location. |
| **`icon`** | Dynamic vector icon resolved from Lucide icon library | `{ "name": "Sparkles" }` | **Services**: Visual category badge, service feature highlights (e.g. `ShieldCheck`, `Clock`, `Sparkles`). |
| **`date_time`** | Formatted date/time stamp matching user locale | `{ "value": "2026-08-01T10:00:00Z" }` | **Articles/Services**: Event date, scheduled webinar, last medical review timestamp. |

##### 💡 How to Add & Sequence Custom Fields in the Dashboard:
1. In the Service or Article Editor, scroll down to **Custom Fields** and click **"Add Custom Field"**.
2. **Select Type**: Choose the appropriate type from the dropdown (e.g., `text-description`, `list`, `photo`, `video-youtube`, `link`, `text-info`).
3. **Set Display Label**: Provide a clear heading (e.g., *"Key Takeaways"*, *"Doctor Commentary"*, *"Download Printable Care Guide"*).
4. **Enter Data**: Fill the text, add multiple bullet items for lists, paste the YouTube link, or upload the image.
5. **Drag-and-Drop Order**: Reorder blocks freely. The client website renders them block-by-block in the exact visual sequence defined here.

#### 4. The Mechanics of SEO Metadata (`seo_data`)
To ensure every service or article achieves top search visibility:
1. Expand the **SEO Settings** panel at the bottom of the editor.
2. **Meta Title & Description**: Configure tailored search engine keywords.
3. **Social Image (`og_image`)**: Set the social card image URL.
4. **Search Engine Indexing**: Toggle the "Indexable" switch (`true`/`false`).

#### 5. Connecting the Client Application
Once the live data and custom fields are populated, the user navigates to **Settings → API Keys** (`/settings/api-keys`), generates a secure key bound to their frontend domain, and configures it in the client application.

---

## 🎨 Practical Examples: How Services & Articles Look with Custom Fields

> **IMPORTANT**: The examples below illustrate **what the final rendered content looks like** when an administrator adds custom fields via the Dashboard. AI models should use these as **visual blueprints** to understand the data structure and then creatively design their own unique UI implementation — **not copy a fixed component**.

---

### Example A: A Typical Service Page

Imagine an administrator creates a **"Brand Identity Design"** service in the Dashboard with the following custom fields.

**The Public API returns this `meta_data` JSON array:**

```json
[
  {
    "id": "field-icon-1",
    "label": "Service Icon",
    "type": "icon",
    "data": { "name": "Palette" }
  },
  {
    "id": "field-desc-1",
    "label": "Description",
    "type": "text-description",
    "data": { "text": "We craft unique brand identities that resonate with your target audience..." }
  },
  {
    "id": "field-price-1",
    "label": "Price",
    "type": "text-info",
    "data": { "text": "$1,200 — Starting Package" }
  },
  {
    "id": "field-time-1",
    "label": "Delivery Time",
    "type": "text-info",
    "data": { "text": "10–14 Business Days" }
  },
  {
    "id": "field-list-1",
    "label": "What's Included",
    "type": "list",
    "data": { 
      "items": [
        "Logo Design (3 Concepts)",
        "Brand Style Guide",
        "Business Card Design",
        "Social Media Kit",
        "Unlimited Revisions"
      ] 
    }
  },
  {
    "id": "field-photo-1",
    "label": "Portfolio Preview",
    "type": "photo",
    "data": { "url": "https://cdn.example.com/portfolio.jpg", "alt": "Brand portfolio" }
  },
  {
    "id": "field-video-1",
    "label": "Process Walkthrough",
    "type": "video-youtube",
    "data": { "url": "https://www.youtube.com/embed/dQw4w9WgXcQ" }
  },
  {
    "id": "field-link-1",
    "label": "Book a Consultation",
    "type": "link",
    "data": { "url": "https://calendly.com/your-link", "label": "Schedule a Free Call" }
  }
]
```

**What the client app should render (visual structure based on the JSON array above):**

```
┌─────────────────────────────────────────────────────────────┐
│  [🎨 Palette Icon]                                          │
│                                                             │
│  Brand Identity Design                    ← Service Title   │
│  Category: Design & Branding              ← Category Badge  │
│                                                             │
│  "We craft unique brand identities..."    ← text-description│
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ 💰 $1,200        │  │ 🕐 10–14 Days    │  ← text-info   │
│  │ Starting Package │  │ Business Days    │    badges       │
│  └──────────────────┘  └──────────────────┘                 │
│                                                             │
│  What's Included:                          ← list           │
│  ✅ Logo Design (3 Concepts)                                │
│  ✅ Brand Style Guide                                       │
│  ✅ Business Card Design                                    │
│  ✅ Social Media Kit                                        │
│  ✅ Unlimited Revisions                                     │
│                                                             │
│  [────── Portfolio Image ──────]           ← photo          │
│                                                             │
│  [──── YouTube Video Embed ────]           ← video-youtube  │
│                                                             │
│  [ 🔗 Schedule a Free Call ]               ← link (CTA)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

The SEO `<head>` tags for this page are automatically derived from `seo_data`:
- `<title>Brand Identity Design — YourBrand</title>`
- `<meta name="description" content="Professional brand identity..." />`
- `<meta property="og:image" content="https://cdn.example.com/portfolio.jpg" />`

---

### Example B: A Typical Article Page

An administrator publishes a **"5 Essential Tips for Startup Branding"** article. 

**The Public API returns this base Article data (with native columns):**

```json
{
  "title": "5 Essential Tips for Startup Branding",
  "slug": "5-essential-tips-for-startup-branding",
  "author_name": "Alexander Wright",
  "excerpt": "Learn the key principles that make startup brands stand out...",
  "preview_image_url": "https://cdn.example.com/article-cover.jpg",
  "reading_time_minutes": 7,
  "published_at": "2026-08-01T10:00:00Z",
  "category_name": "Guides",
  "category_slug": "guides"
}
```

**Plus the modular `meta_data` JSON array that builds the full article layout:**

```json
[
  {
    "id": "field-desc-intro",
    "label": "Introduction",
    "type": "text-description",
    "data": { "text": "Building a memorable brand identity is the most critical milestone for any emerging startup. In this guide, we explore the foundational pillars..." }
  },
  {
    "id": "field-takeaways-1",
    "label": "Key Takeaways",
    "type": "list",
    "data": { 
      "items": [
        "Define your brand voice and core positioning first", 
        "Invest in a professional logo and versatile typography", 
        "Maintain visual consistency across all customer touchpoints"
      ] 
    }
  },
  {
    "id": "field-desc-deep",
    "label": "Detailed Analysis",
    "type": "text-description",
    "data": { "text": "Consistency breeds trust. When your visual language aligns with your customer expectations, conversion rates increase by over 30%..." }
  },
  {
    "id": "field-resource-1",
    "label": "Downloadable Guide",
    "type": "link",
    "data": { "url": "https://example.com/branding-guide.pdf", "label": "Download Full PDF Guide" }
  }
]
```

**What the client app should render (visual structure):**

```
┌─────────────────────────────────────────────────────────────┐
│  [────────── Cover Image ──────────]       ← preview_image  │
│                                                             │
│  Guides                                    ← Category Badge │
│  5 Essential Tips for Startup Branding     ← Title          │
│  Aug 1, 2026  ·  📖 7 min read             ← reading_time   │
│                                                             │
│  Learn the key principles that make        ← Excerpt        │
│  startup brands stand out...                                │
│                                                             │
│  ──────── Article Narrative ─────────      ← text-description│
│  (Full rendered section paragraphs)                          │
│  ────────────────────────────────────                        │
│                                                             │
│  Key Takeaways:                            ← list           │
│  ✅ Define your brand voice first                           │
│  ✅ Invest in a professional logo                           │
│  ✅ Consistency across all platforms                        │
│                                                             │
│  [ 📥 Download Full Guide ]                ← link (CTA)    │
│                                                             │
│  ─────── Comments Section ───────          ← Public API     │
│  (GET /api/public/articles/:slug/comments)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Example C: Educational Blueprint & Walkthrough (For Explanation & User Training Only)

> ⚠️ **STRICTLY EDUCATIONAL / NOT FOR COPY-PASTING OR CLONING**:  
> The medical and dental examples below are **strictly conceptual walkthroughs to help AI models explain and teach the user how to configure their own custom data**. Every clinic or business has unique services, doctors, pricing tiers, and treatments. AI Assistants must use these examples **to explain how custom fields work** and then guide the user to input their own genuine clinic information.

#### 1. Core Clinic Services (`/services`):

##### Service 1: `Invisalign & Clear Aligners`
- **Title**: `Invisalign & Clear Aligners`
- **Slug**: `invisalign-clear-aligners` (Auto-generated)
- **Display Order**: `1`
- **Status**: `Active`
- **Custom Fields (`meta_data`)**:
  1. `text-info` ➔ Label: `Estimated Duration` | Value: `4 – 9 Months`
  2. `text-info` ➔ Label: `Price Range` | Value: `From $1,850`
  3. `list` ➔ Label: `What's Included` | Items: `3D Digital Intraoral Scan`, `Custom Clear Aligners Kit`, `Monthly Progress Monitoring`, `Post-Treatment Retainers Set`
  4. `video-youtube` ➔ Label: `Treatment Walkthrough` | URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
  5. `photo` ➔ Label: `Before & After Result` | URL: `https://cdn.example.com/invisalign-case.jpg`
- **SEO Settings (`seo_data`)**:
  - Meta Title: `Invisalign & Clear Aligners in New York | Aura Dental Clinic`
  - Meta Description: `Straighten your teeth discreetly with custom Invisalign clear aligners. Book a 3D digital scan consultation today.`

##### Service 2: `Porcelain Veneers & Smile Design`
- **Title**: `Porcelain Veneers & Smile Design`
- **Slug**: `porcelain-veneers-smile-design`
- **Display Order**: `2`
- **Status**: `Active`
- **Custom Fields (`meta_data`)**:
  1. `text-info` ➔ Label: `Procedure Time` | Value: `2 Appointments`
  2. `text-info` ➔ Label: `Starting Price` | Value: `From $950 / Tooth`
  3. `list` ➔ Label: `Veneer Highlights` | Items: `Custom Shade & Shape Matching`, `Ultra-Thin E-Max Porcelain`, `Stain Resistant Surface`, `10-Year Quality Warranty`
  4. `photo` ➔ Label: `Smile Transformation` | URL: `https://cdn.example.com/veneers-case.jpg`
- **SEO Settings (`seo_data`)**:
  - Meta Title: `Custom Porcelain Veneers | Cosmetic Smile Makeover`
  - Meta Description: `Transform your smile with handcrafted porcelain veneers. Natural appearance, stain resistant, and custom fitted.`

##### Service 3: `Dental Implants & Restorative Care`
- **Title**: `Dental Implants & Restorative Care`
- **Slug**: `dental-implants-restorative`
- **Display Order**: `3`
- **Status**: `Active`
- **Custom Fields (`meta_data`)**:
  1. `text-info` ➔ Label: `Healing Time` | Value: `3 – 6 Months`
  2. `text-info` ➔ Label: `Pricing` | Value: `Consultation + Financing Available`
  3. `list` ➔ Label: `Surgical Package` | Items: `Titanium Implant Post`, `Custom Zirconia Crown`, `3D CBCT Bone Scan`, `Sedation & Pain Management`
- **SEO Settings (`seo_data`)**:
  - Meta Title: `Permanent Dental Implants | Permanent Tooth Replacement`
  - Meta Description: `Restore missing teeth permanently with biocompatible titanium implants and natural zirconia crowns.`

---

#### 2. Patient Education Articles (`/articles`):

##### Article 1: `Invisalign vs Traditional Braces: Which Is Right for Your Smile?`
- **Title**: `Invisalign vs Traditional Braces: Which Is Right for Your Smile?`
- **Slug**: `invisalign-vs-traditional-braces`
- **Cover Image (`preview_image_url`)**: `https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80`
- **Reading Time (Native Column)**: `5` minutes
- **Category (Optional)**: `Orthodontics`
- **Excerpt**: `A comprehensive clinical comparison between clear aligners and metal brackets covering treatment duration, daily comfort, hygiene convenience, and aesthetic appeal.`
- **Custom Modular Blocks (`meta_data`)**:
  1. `text-info` ➔ Label: `Medical Reviewer` | Value: `Dr. Elena Rostova, DMD (Specialist Orthodontist)`
  2. `text-description` ➔ Label: `Overview` | Value: `Choosing between clear aligners and traditional braces is one of the most common orthodontic decisions. Modern clear aligners use medical-grade SmartTrack plastic to exert gentle, continuous pressure on teeth without metal wires or brackets, making them virtually invisible during daily conversations.`
  3. `list` ➔ Label: `Key Advantages of Invisalign Clear Aligners` | Items: `Removable for eating, drinking, and effortless daily brushing and flossing.`, `Virtually invisible in social and professional workplace settings.`, `No emergency appointments for snapped wires or loose metal brackets.`, `3D digital simulation shows your projected smile outcome before treatment starts.`
  4. `text-info` ➔ Label: `Clinical Doctor Recommendation` | Value: `Clear aligners must be worn for 20 to 22 hours per day to achieve optimal planned tooth movement.`
  5. `link` ➔ Label: `Book an Orthodontic Scan` | URL: `https://calendly.com/sana-dental/invisalign`
- **SEO Settings (`seo_data`)**:
  - Meta Title: `Invisalign vs Traditional Braces: Clinical Comparison | Sana Dental`
  - Meta Description: `Compare Invisalign clear aligners and metal braces for comfort, speed, and aesthetics. Read our specialist dentist clinical guide.`
  - Social Image: `https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80`

##### Article 2: `Why 3D Digital Impressions Have Replaced Messy Dental Putty Trays`
- **Title**: `Why 3D Digital Impressions Have Replaced Messy Dental Putty Trays`
- **Slug**: `3d-digital-impressions-vs-putty-trays`
- **Cover Image (`preview_image_url`)**: `https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80`
- **Reading Time (Native Column)**: `4` minutes
- **Category (Optional)**: `Dental Technology`
- **Excerpt**: `Learn how modern optical intraoral scanners create precise 3D digital models of your teeth in minutes with zero gag reflex and unmatched clinical accuracy.`
- **Custom Modular Blocks (`meta_data`)**:
  1. `text-info` ➔ Label: `Medical Reviewer` | Value: `Dr. Alexander Wright, DDS (Lead Restorative Dentist)`
  2. `text-description` ➔ Label: `The Evolution of Dental Impressions` | Value: `Traditional impression trays filled with cold alginate putty frequently triggered uncomfortable gag reflexes and required retakes. Optical 3D intraoral scanners capture thousands of high-definition images per second, assembling a flawless 3D model of your bite in real time.`
  3. `list` ➔ Label: `Why Patients Prefer Digital Scanning` | Items: `100% mess-free with zero gag reflex or chemical taste.`, `Instant on-screen 3D visualization of your teeth and bite alignment.`, `Sub-millimeter accuracy for perfectly fitting crowns, veneers, and nightguards.`, `Direct digital transfer to dental labs for faster treatment delivery.`
  4. `link` ➔ Label: `Experience Digital Dentistry` | URL: `/contact`
- **SEO Settings (`seo_data`)**:
  - Meta Title: `3D Digital Impressions vs Dental Putty Trays | Sana Dental`
  - Meta Description: `Discover how 3D optical scanning replaces messy putty trays with zero gag reflex and micron-level precision.`
  - Social Image: `https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80`

##### Article 3: `How to Properly Care for Porcelain Veneers: 7 Daily Habits`
- **Title**: `How to Properly Care for Porcelain Veneers and Extend Their Lifespan`
- **Slug**: `caring-for-porcelain-veneers-longevity`
- **Cover Image (`preview_image_url`)**: `https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&q=80`
- **Reading Time (Native Column)**: `5` minutes
- **Category (Optional)**: `Cosmetic Dentistry`
- **Excerpt**: `Porcelain veneers can easily last 15 to 20 years with proper daily hygiene, non-abrasive toothpaste, and routine dental cleanings. Here is our dentist-approved care guide.`
- **Custom Modular Blocks (`meta_data`)**:
  1. `text-info` ➔ Label: `Medical Reviewer` | Value: `Dr. Sarah Jenkins, DDS (Cosmetic Dentist)`
  2. `text-description` ➔ Label: `Daily Maintenance Essentials` | Value: `High-quality porcelain ceramic (such as IPS e.max) is exceptionally resistant to staining and wear. However, the underlying natural tooth and surrounding gum tissue require gentle, consistent daily hygiene to preserve the bond margin.`
  3. `list` ➔ Label: `Essential Care Guidelines` | Items: `Use a soft-bristled toothbrush and non-abrasive fluoride toothpaste.`, `Wear a custom nightguard if you have a habit of clenching or grinding teeth during sleep.`, `Avoid using front teeth as tools to open packages, crack nuts, or bite hard objects.`, `Schedule professional dental cleanings every 6 months to polish ceramic margins.`
  4. `link` ➔ Label: `Book a Veneer Checkup` | URL: `/contact?service=porcelain-veneers`
- **SEO Settings (`seo_data`)**:
  - Meta Title: `How to Care for Porcelain Veneers | Cosmetic Dentistry Guide`
  - Meta Description: `Learn dentist-approved daily habits to protect your porcelain veneers and keep them sparkling for 15+ years.`
  - Social Image: `https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&q=80`

##### Article 4: `Signs You Need a Root Canal vs a Standard Dental Filling`
- **Title**: `Signs You Need a Root Canal vs a Standard Dental Filling`
- **Slug**: `root-canal-vs-dental-filling-signs`
- **Cover Image (`preview_image_url`)**: `https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80`
- **Reading Time (Native Column)**: `6` minutes
- **Category (Optional)**: `Restorative Dentistry`
- **Excerpt**: `Understand the key clinical symptoms that indicate decay has reached the inner dental pulp and why modern microscope-guided therapy preserves natural teeth painlessly.`
- **Custom Modular Blocks (`meta_data`)**:
  1. `text-info` ➔ Label: `Medical Reviewer` | Value: `Dr. Marcus Vance, BDS (Endodontic Specialist)`
  2. `text-description` ➔ Label: `Understanding Tooth Anatomy` | Value: `When cavity decay remains within enamel and dentin, a standard tooth-colored composite filling is sufficient. When bacterial infection reaches the vascular pulp chamber, microscopic root canal therapy is required to disinfect the canals and save the tooth from extraction.`
  3. `list` ➔ Label: `Symptoms Indicating Pulp Inflammation` | Items: `Lingering sensitivity to hot or cold drinks that persists for several minutes.`, `Sharp, throbbing pain when biting down or chewing food.`, `Spontaneous toothache waking you up at night without any pressure.`, `Swelling or tenderness on the gum tissue near the affected tooth root.`
  4. `link` ➔ Label: `Emergency Tooth Pain Consultation` | URL: `/contact`
- **SEO Settings (`seo_data`)**:
  - Meta Title: `Root Canal vs Filling: Symptoms & Diagnosis | Sana Dental`
  - Meta Description: `Identify whether your tooth pain requires a simple filling or microscopic root canal treatment.`
  - Social Image: `https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80`

##### Article 5: `In-Office Laser Teeth Whitening vs At-Home Trays`
- **Title**: `In-Office Laser Teeth Whitening vs At-Home Trays: What Works Best?`
- **Slug**: `laser-teeth-whitening-vs-home-trays`
- **Cover Image (`preview_image_url`)**: `https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80`
- **Reading Time (Native Column)**: `4` minutes
- **Category (Optional)**: `Cosmetic Dentistry`
- **Excerpt**: `Discover the differences in shade brightening power, safety, sensitivity control, and treatment speed between professional laser whitening and drugstore kits.`
- **Custom Modular Blocks (`meta_data`)**:
  1. `text-info` ➔ Label: `Medical Reviewer` | Value: `Dr. Sarah Jenkins, DDS (Cosmetic Dentist)`
  2. `text-description` ➔ Label: `Professional Whitening Safety` | Value: `In-office whitening utilizes medical-grade hydrogen peroxide activated by specific wavelength lasers under full gum barrier protection, brightening enamel by up to 6 to 8 shades in a single 45-minute session without irritating soft tissues.`
  3. `list` ➔ Label: `Benefits of In-Office Whitening` | Items: `Immediate visible results in a single 45-minute appointment.`, `Protective gingival barrier prevents gum burns and tooth dehydration.`, `Desensitizing remineralizing paste applied post-treatment.`, `Safe for natural enamel when supervised by licensed dental clinicians.`
  4. `link` ➔ Label: `Book Whitening Appointment` | URL: `/contact?service=teeth-whitening`
- **SEO Settings (`seo_data`)**:
  - Meta Title: `Laser Teeth Whitening vs Home Trays Comparison | Sana Dental`
  - Meta Description: `Explore the clinical differences between laser whitening and take-home trays for enamel safety and fast shade brightening.`
  - Social Image: `https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80`

##### Article 6: `Modern Dental Implants: From Single Tooth to Full Smile Restoration`
- **Title**: `Modern Dental Implants: From Single Tooth Replacement to Full Smile Restoration`
- **Slug**: `modern-dental-implants-guide`
- **Cover Image (`preview_image_url`)**: `https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80`
- **Reading Time (Native Column)**: `5` minutes
- **Category (Optional)**: `Restorative Dentistry`
- **Excerpt**: `Learn how biocompatible titanium fixtures and 3D surgical guides make tooth replacement natural, long-lasting, and bone-preserving.`
- **Custom Modular Blocks (`meta_data`)**:
  1. `text-info` ➔ Label: `Medical Reviewer` | Value: `Dr. Alexander Wright, DDS (Lead Implantologist)`
  2. `text-description` ➔ Label: `Permanent Tooth Replacement` | Value: `Dental implants integrate directly with your jawbone through osseointegration, preventing bone loss that occurs after tooth loss and supporting ceramic crowns that look, feel, and function just like natural teeth.`
  3. `list` ➔ Label: `Key Advantages of Implants` | Items: `Permanent, stable foundation with a 98%+ clinical success rate.`, `Preserves adjacent healthy teeth without filing down enamel.`, `Restores full chewing power and natural speech clarity.`, `Long-term durability with lifetime manufacturer warranty.`
  4. `link` ➔ Label: `Book Implant Consultation` | URL: `/contact?service=dental-implants`
- **SEO Settings (`seo_data`)**:
  - Meta Title: `Comprehensive Dental Implants Guide | Permanent Tooth Replacement`
  - Meta Description: `Discover how 3D-guided titanium dental implants restore chewing function and preserve facial bone structure.`
  - Social Image: `https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80`

---

### Key Takeaway for AI Models

The `meta_data` array is **completely flexible** — every administrator will configure different fields for different services and articles. The AI model must:

1. **Never assume fixed fields exist** (e.g. don't hardcode `service.price` or `article.readingTime` as root properties).
2. **Iterate `meta_data` dynamically** and dispatch rendering based on each item's `type` field.
3. **Design creatively** — the visual layout, card styles, animations, and component structure are entirely up to the AI model's creative interpretation. The examples above define **what data appears**, not **how it must look**.

---

## 🎨 The 4 Core Principles of Dynamic Frontend Rendering & Content Management

### 1. Dynamic Data-Driven UI (Design Once, Render N Items Dynamically)
When the AI assistant designs a UI component (e.g., `ServiceCard`, `ArticleCard`, `ServiceGrid`, `BlogCarousel`):
- **Universal Dynamic Mapping**: The single card template dynamically maps and renders **whatever data the administrator enters**, regardless of the number of items.
- If the user creates 1 service, the grid displays 1 card; if they create 4, 10, or 50 services, the exact same component renders all of them cleanly using CSS Grid / Flexbox without any code modifications.

### 2. Unified Design System with Adaptive Field Rendering
- **Unified Visual Identity**: All cards in the application adhere to a cohesive design language (consistent typography, border radii, glassmorphic subtle borders, interactive hover animations, and color tokens).
- **Adaptive Flexibility**: The card component is designed to be **adaptive**. If Service A includes a YouTube video embed and Service B only has pricing pills and a bullet list, the component gracefully renders only the available blocks without awkward empty spaces or broken layouts.

### 3. Display Priority & Homepage Pinning (`sort_order`)
- **Pinned Priority (`sort_order > 0`)**: Items with a non-zero integer are explicitly pinned to the top of the frontend display (`sort_order = 1` appears before `sort_order = 2`).
- **Standard Items (`sort_order = 0`)**: Unpinned items that automatically follow pinned records, ordered by creation date.
- **Pre-Sorted API Delivery**: The Public API returns all records pre-sorted by `sort_order ASC`, allowing the business administrator to curate the exact visual order of their showcase services and category tabs directly from the Dashboard.

### 4. Active & Inactive Status Visibility Control (`is_active`)
- **Published Active (`is_active: 1`)**: The service or article is immediately accessible and visible across all Public API endpoints and frontend widgets.
- **Draft / Archived Inactive (`is_active: 0`)**: The record is completely excluded from Public API responses.
- **Why It Matters**: This empowers business owners to draft new medical procedures, test custom field combinations, or pause seasonal promotional campaigns without deleting valuable data or exposing incomplete drafts to site visitors.

---

## 🤖 Summary Rules for AI Assistants

- **English Only Documentation**: All technical context, guides, and agent directives must be written strictly in professional technical English to match the rest of the documentation index.
- **Educational Blueprints Only (No Cloning)**: The examples provided in this document are **strictly conceptual walkthroughs for teaching and explaining** how custom fields (`meta_data`) and SEO work. AI models must use them to educate and guide the user to input their own genuine clinic/business information, rather than cloning or copy-pasting demo data.
- **Dynamic over Static**: Never hardcode expected custom field names (e.g. don't assume `service.price` exists on root). Always parse `meta_data` array items matching `09-field-schemas.md`.
- **Always Include SEO Tags**: Automatically inject `<title>`, `<meta description>`, Open Graph tags (`og:image`), and indexing directives (`is_indexable`) derived from `seo_data`.
- **Clear Admin Guidance**: When users ask *"How do I change the displayed service price, features, or Google search title?"*, point them directly to their own **AuraDash Admin Dashboard → Services / Articles → Edit → Custom Fields & SEO Settings** (via their custom admin URL or local development instance).
