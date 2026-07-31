-- Migration: Add missing columns to Business_Settings
-- Required by workspace.services.ts but absent from all previous migrations

-- Social media links (JSON object)
ALTER TABLE Business_Settings ADD COLUMN social_links JSON;

-- Business locations (JSON array)
ALTER TABLE Business_Settings ADD COLUMN locations JSON;

CREATE TABLE Media (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,           -- الاسم الأصلي للملف (مثال: hero-bg.png)
    file_url TEXT NOT NULL,            -- الرابط العام القادم من R2 (CDN URL)
    mime_type TEXT NOT NULL,           -- نوع الملف (مثال: image/jpeg, application/pdf)
    size_bytes INTEGER NOT NULL,       -- حجم الملف بالبايت (لمنع تجاوز سعة العميل)
    alt_text TEXT,                     -- نص بديل مهم جداً للـ SEO (Marketing Site)
    folder TEXT DEFAULT '/',           -- لتنظيم الملفات في مجلدات مستقبلاً
    created_by TEXT,                   -- معرف المستخدم الذي رفع الصورة
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- مؤشرات لتسريع الفلترة والبحث داخل اللوحة
CREATE INDEX idx_media_mime ON Media(mime_type);
CREATE INDEX idx_media_folder ON Media(folder);
CREATE INDEX idx_media_created ON Media(created_at);
