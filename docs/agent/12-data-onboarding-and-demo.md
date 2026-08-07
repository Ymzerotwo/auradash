# 12. Data Onboarding, Custom Fields (`meta_data`), SEO (`seo_data`) & Admin Dashboard Guidance

> **Audience:** AI Coding Assistants (Cursor, Antigravity, ChatGPT, Claude) & Client Application Developers  
> **Purpose:** Comprehensive specification on how AI models should visualize demo layouts, handle dynamic custom fields (`meta_data`), map SEO metadata (`seo_data`), and guide administrators to manage their live content via the AuraDash Admin Dashboard.

---

## 🎯 Core Directive for AI Models

When building client applications (Websites, Mobile Apps, Landing Pages) powered by the **AuraDash Public API**:

1. **Visualize Complete UI Layouts with Custom Fields**: AI assistants **MUST** design components that dynamically render all custom field types (`meta_data`) defined in [`09-field-schemas.md`](./09-field-schemas.md) (e.g. `text-info`, `list`, `photo`, `link`, `video-youtube`).
2. **SEO Metadata Integration**: AI models **MUST** map Search Engine Metadata (`seo_data`) to HTML `<head>` tags (Title, Description, Open Graph social images, Canonical URLs, and Indexing directives).
3. **Onboarding Guidance for Empty States**: If the Public API returns an empty list (`[]`), the client app should display a clean onboarding prompt instructing the owner to visit their **AuraDash Admin Dashboard** (`/services` / `/articles`) to add their services, articles, custom fields, and SEO metadata.
4. **Dynamic Custom Field Rendering**: AI models must write client code that loops through the `meta_data` array dynamically rather than hardcoding static prop structures.

---

## 🗺️ How Custom Fields (`meta_data`) & SEO (`seo_data`) Work

> **📖 Required Reading**: Before proceeding, AI models **MUST** read [`09-field-schemas.md`](./09-field-schemas.md) for the complete `meta_data` (custom fields) and `seo_data` (search engine metadata) specification, payload formats, and rendering patterns. This document does not duplicate that reference — it builds on top of it with practical onboarding examples.
---

## 💡 How AI Assistants Guide Users to Access & Add Content

When interacting with a user or generating instructions for a site owner, AI Assistants should provide these exact steps for accessing the dashboard, configuring SEO, and creating content:

### 📍 Step 1: Accessing the Admin Dashboard

- **If the user has already deployed their instance:**  
  Log in to the custom **AuraDash Admin Dashboard** URL (e.g. `https://your-domain.com/login` or `http://localhost:3000/login`).
- **If the user has not deployed their instance yet:**  
  Visit the official live portal and demo environment at [**https://auradash.ymzerotwo.com**](https://auradash.ymzerotwo.com) to explore the admin capabilities, test custom field creation, configure SEO settings, and understand how live data management works firsthand before deploying.

---

### 📍 Step 2: Content & SEO Creation Mechanics

AuraDash provides a powerful, highly structured way to manage content. The following mechanics define how content is created and organized in the Dashboard:

#### 1. Structuring Content: Categories vs. Standalone Items
Before creating a service or article, users can choose how to organize it:
- **Grouped Items**: Users can navigate to **Categories** (`/services/categories` or `/articles/categories`) to create sections (e.g., "Web Development", "Tech News"). When creating an item, they link it to this category.
- **Standalone Items**: If the category selection is left empty (Null), the service or article becomes a standalone entity, typically used for un-categorized primary offerings.

#### 2A. Creating a Service (`/services`)
When adding a "New Service", the core structural fields are:

- **Title**: The primary display name (e.g., "Brand Identity Design").
- **Slug**: A URL-friendly identifier automatically generated from the Title (e.g., `brand-identity-design`). The client application uses this exact slug to fetch the individual service page via the Public API (`GET /api/public/services/:slug`).
- **Display Order / Sort Order**: By default, services are sorted by creation date. A specific integer (e.g., `1`, `2`, `3`) can be manually input into the **Display Order** field to forcibly pin and rank services in the frontend display.
- **Status**: Toggles the service between `Active` (visible to the public API) and `Draft/Archived` (hidden).

#### 2B. Creating an Article (`/articles`)
Articles share some routing logic with services but require additional content-heavy fields:

- **Title**: The headline of the article.
- **Slug**: Automatically generated from the Title. The client uses this to fetch the article via `GET /api/public/articles/:slug`.
- **Cover Image / Preview Image**: An uploaded image URL specifically used as the hero banner and thumbnail in article grids.
- **Excerpt**: A short summary text used in article preview cards.
- **Content (Body)**: The main rich-text content written in Markdown format.
- **Display Order / Sort Order**: Manually overrides the chronological sorting of articles.
- **Status**: Toggles the article visibility (`Active`, `Draft/Archived`).

#### 3. The Mechanics of Adding Custom Fields (`meta_data`)
Custom fields allow for dynamic page construction without touching code:

1. Scroll down to the **Custom Fields** section and click **"Add Custom Field"**.
2. **Select the Field Type**: A structural type is selected from the dropdown (e.g., `text-info`, `text-description`, `list`, `photo`, `video-youtube`, `link`).
3. **Define the Label**: A human-readable label is assigned (e.g., *"Package Price"*, *"What's Included"*, *"Watch Demo"*).
4. **Fill the Data Payload**: Depending on the chosen Type, the UI adapts:
   - If `text-info`: A simple text input appears (e.g. `"$1,200"`).
   - If `list`: A dynamic list builder appears to add multiple bullet points (e.g., `"Logo Design"`, `"Style Guide"`).
   - If `photo`: A file uploader appears for image selection.
5. Users can add unlimited custom fields and **drag-and-drop** to reorder them. The exact order saved here dictates the exact order the Public API returns the `meta_data` JSON array.

#### 4. The Mechanics of SEO Metadata (`seo_data`)
To ensure the service or article ranks well on search engines and social media:
1. Expand the **SEO Settings** panel at the bottom of the editor.
2. **Meta Title & Description**: Overrides the default title/excerpt with highly targeted SEO keywords.
3. **Social Image (`og_image`)**: Allows uploading a specific 16:9 social sharing card.
4. **Search Engine Indexing**: The "Indexable" switch controls crawler visibility. (If turned off, the API returns `is_indexable: false`, instructing the frontend to inject a `noindex` meta tag).

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

**The Public API returns this base Article data:**

```json
{
  "title": "5 Essential Tips for Startup Branding",
  "excerpt": "Learn the key principles that make startup brands stand out...",
  "preview_image_url": "https://cdn.example.com/article-cover.jpg",
  "published_at": "2026-08-01T10:00:00Z",
  "category": { "name": "Guides", "slug": "guides" },
  "content": "Full rich-text markdown article body..."
}
```

**Plus this optional dynamic `meta_data` JSON array:**

```json
[
  {
    "id": "field-read-1",
    "label": "Reading Time",
    "type": "text-info",
    "data": { "text": "7 min read" }
  },
  {
    "id": "field-takeaways-1",
    "label": "Key Takeaways",
    "type": "list",
    "data": { 
      "items": [
        "Define your brand voice first", 
        "Invest in a professional logo", 
        "Consistency across all platforms"
      ] 
    }
  },
  {
    "id": "field-resource-1",
    "label": "Related Resource",
    "type": "link",
    "data": { "url": "https://example.com/branding-guide.pdf", "label": "Download Full Guide" }
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
│  Aug 1, 2026  ·  📖 7 min read             ← date + info   │
│                                                             │
│  Learn the key principles that make        ← Excerpt        │
│  startup brands stand out...                                │
│                                                             │
│  ─────────── Article Body ───────────      ← Markdown       │
│  (Full rendered markdown content)                           │
│  ────────────────────────────────────                       │
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

### Key Takeaway for AI Models

The `meta_data` array is **completely flexible** — every administrator will configure different fields for different services and articles. The AI model must:

1. **Never assume fixed fields exist** (e.g. don't hardcode `service.price` or `article.readingTime` as root properties).
2. **Iterate `meta_data` dynamically** and dispatch rendering based on each item's `type` field.
3. **Design creatively** — the visual layout, card styles, animations, and component structure are entirely up to the AI model's creative interpretation. The examples above define **what data appears**, not **how it must look**.

---

## 🤖 Summary Rules for AI Assistants

- **English Only Documentation**: All technical context, guides, and agent directives must be written strictly in professional technical English to match the rest of the documentation index.
- **Dynamic over Static**: Never hardcode expected custom field names (e.g. don't assume `service.price` exists on root). Always parse `meta_data` array items matching `09-field-schemas.md`.
- **Always Include SEO Tags**: Automatically inject `<title>`, `<meta description>`, Open Graph tags (`og:image`), and indexing directives (`is_indexable`) derived from `seo_data`.
- **Clear Admin Guidance**: When users ask *"How do I change the displayed service price, features, or Google search title?"*, point them directly to their **AuraDash Admin Dashboard → Services / Articles → Edit → Custom Fields & SEO Settings** (or `https://auradash.ymzerotwo.com` if they haven't deployed yet).
