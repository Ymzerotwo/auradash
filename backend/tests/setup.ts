///<reference types="@cloudflare/vitest-pool-workers" />
import { env } from 'cloudflare:test';
import { beforeAll, beforeEach } from 'vitest';

const createStatements = [
  // 1. Users Table
  `CREATE TABLE IF NOT EXISTS Users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      photo_url TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'User')),
      permissions JSON,
      job_title TEXT,
      is_banned INTEGER DEFAULT 0,
      banned_by TEXT,
      password_updated_at DATETIME,
      password_updated_by TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (banned_by) REFERENCES Users (id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_username ON Users (username)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON Users (email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON Users (role)`,
  `CREATE INDEX IF NOT EXISTS idx_users_created_by ON Users (created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_users_updated_by ON Users (updated_by)`,
  `CREATE INDEX IF NOT EXISTS idx_users_banned_by ON Users (banned_by)`,
  `CREATE INDEX IF NOT EXISTS idx_users_created_at ON Users (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_users_is_banned ON Users (is_banned)`,

  // 2. Sessions Table (for legacy compat if needed, otherwise matches disabled structure in sql)
  `CREATE TABLE IF NOT EXISTS Sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      is_revoked INTEGER DEFAULT 0,
      user_agent TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON Sessions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON Sessions (expires_at)`,

  // 3. Verification Codes Table
  `CREATE TABLE IF NOT EXISTS VerificationCodes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_verification_code ON VerificationCodes (code)`,
  `CREATE INDEX IF NOT EXISTS idx_verification_user_code ON VerificationCodes (user_id, code)`,

  // 4. ApiKeys Table
  `CREATE TABLE IF NOT EXISTS ApiKeys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      short_key TEXT NOT NULL,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_apikeys_created_at ON ApiKeys (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_apikeys_created_by ON ApiKeys (created_by)`,

  // 5. Service Category Table
  `CREATE TABLE IF NOT EXISTS service_category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      meta_data JSON,
      seo_data JSON,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_at DATETIME,
      updated_by TEXT,
      FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_categories_is_active ON service_category (is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_sort ON service_category (sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_created_by ON service_category (created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_updated_by ON service_category (updated_by)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_created_at ON service_category (created_at DESC)`,

  // 6. Services Table
  `CREATE TABLE IF NOT EXISTS Services (
      id TEXT PRIMARY KEY,
      service_category_id TEXT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      meta_data JSON,
      seo_data JSON,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_at DATETIME,
      updated_by TEXT,
      FOREIGN KEY (service_category_id) REFERENCES service_category (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_services_is_active ON Services (is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_services_category_active ON Services (service_category_id, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_services_slug ON Services (slug)`,
  `CREATE INDEX IF NOT EXISTS idx_services_sort ON Services (sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_services_created_by ON Services (created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_services_updated_by ON Services (updated_by)`,
  `CREATE INDEX IF NOT EXISTS idx_services_created_at ON Services (created_at DESC)`,

  // 7. Business Settings Table
  `CREATE TABLE IF NOT EXISTS Business_Settings (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      logo_url TEXT,
      contact_info JSON,
      social_links JSON,
      locations JSON,
      working_hours JSON,
      currency TEXT DEFAULT 'USD',
      timezone TEXT DEFAULT 'UTC',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // 8. Media Table
  `CREATE TABLE IF NOT EXISTS Media (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      alt_text TEXT,
      folder TEXT DEFAULT '/',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_media_mime ON Media (mime_type)`,
  `CREATE INDEX IF NOT EXISTS idx_media_folder ON Media (folder)`,
  `CREATE INDEX IF NOT EXISTS idx_media_created ON Media (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_media_created_by ON Media (created_by)`,

  // 9. Customers Table
  `CREATE TABLE IF NOT EXISTS Customers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      gender TEXT,
      date_of_birth DATE,
      city TEXT,
      acquisition_source TEXT,
      tags TEXT,
      last_visit_at DATETIME,
      spam BOOLEAN DEFAULT FALSE,
      spam_reason TEXT,
      add_spam_by TEXT,
      add_spam_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_by TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_customers_phone ON Customers (phone)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_email ON Customers (email)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON Customers (last_visit_at)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_spam ON Customers (spam)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_source ON Customers (acquisition_source)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_created_at ON Customers (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_add_spam_by ON Customers (add_spam_by)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_created_by ON Customers (created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_updated_by ON Customers (updated_by)`,

  // 10. Bookings Table
  `CREATE TABLE IF NOT EXISTS Bookings (
      id TEXT PRIMARY KEY,
      booking_number TEXT UNIQUE,
      customer_id TEXT NOT NULL,
      scheduled_from DATETIME,
      scheduled_to DATETIME,
      services_data TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      paid_status TEXT DEFAULT 'unpaid',
      paid_amount REAL DEFAULT 0.0,
      total_paid REAL DEFAULT 0.0,
      payment_history TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT,
      completed_at DATETIME,
      completed_by TEXT,
      cancelled_at DATETIME,
      cancelled_by TEXT,
      cancellation_reason TEXT,
      FOREIGN KEY (customer_id) REFERENCES Customers (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (completed_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (cancelled_by) REFERENCES Users (id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status ON Bookings (status)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON Bookings (booking_number)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_from ON Bookings (scheduled_from)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_to ON Bookings (scheduled_to)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON Bookings (customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON Bookings (created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_completed_by ON Bookings (completed_by)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by ON Bookings (cancelled_by)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON Bookings (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_updated_by ON Bookings (updated_by)`,

  // 11. Article Categories Table
  `CREATE TABLE IF NOT EXISTS Article_Categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT,
      preview_image_url TEXT,
      meta_data JSON,
      seo_data JSON,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_at DATETIME,
      updated_by TEXT,
      FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_article_categories_is_active ON Article_Categories (is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_article_categories_slug ON Article_Categories (slug)`,
  `CREATE INDEX IF NOT EXISTS idx_article_categories_sort ON Article_Categories (sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_article_categories_title ON Article_Categories (title)`,
  `CREATE INDEX IF NOT EXISTS idx_article_categories_created_at ON Article_Categories (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_article_categories_created_by ON Article_Categories (created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_article_categories_updated_by ON Article_Categories (updated_by)`,

  // 12. Articles Table
  `CREATE TABLE IF NOT EXISTS Articles (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT,
      preview_image_url TEXT,
      reading_time_minutes INTEGER,
      author_id TEXT,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      meta_data JSON,
      seo_data JSON,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_at DATETIME,
      updated_by TEXT,
      FOREIGN KEY (category_id) REFERENCES Article_Categories (id) ON DELETE SET NULL,
      FOREIGN KEY (author_id) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_articles_is_active ON Articles (is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_category_active ON Articles (category_id, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_published ON Articles (published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_slug ON Articles (slug)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_title ON Articles (title)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_author ON Articles (author_id)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_category_active_published ON Articles (category_id, is_active, published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_created_at ON Articles (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_created_by ON Articles (created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_updated_by ON Articles (updated_by)`,

  // 13. Article Comments Table
  `CREATE TABLE IF NOT EXISTS Article_Comments (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      user_name TEXT,
      user_email TEXT,
      parent_id TEXT,
      user_id TEXT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      approved_by TEXT,
      FOREIGN KEY (article_id) REFERENCES Articles (id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES Article_Comments (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (approved_by) REFERENCES Users (id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_article_comments_article_status ON Article_Comments (article_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_article_comments_created_at ON Article_Comments (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_article_comments_parent_id ON Article_Comments (parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_article_comments_user_id ON Article_Comments (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_article_comments_approved_by ON Article_Comments (approved_by)`,
  `CREATE INDEX IF NOT EXISTS idx_article_comments_status ON Article_Comments (status)`,
  `CREATE INDEX IF NOT EXISTS idx_article_comments_user_email ON Article_Comments (user_email, created_at DESC)`,

  // 14. Notifications Table
  `CREATE TABLE IF NOT EXISTS Notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      target_id TEXT,
      message_title TEXT,
      message_body TEXT,
      url TEXT,
      is_read INTEGER DEFAULT 0 CHECK (is_read IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON Notifications (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON Notifications (user_id, is_read)`,

  // 15. Inbox Table
  `CREATE TABLE IF NOT EXISTS Inbox (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      inquiry_type TEXT NOT NULL DEFAULT 'general' CHECK (inquiry_type IN ('general', 'service', 'offer')),
      message TEXT,
      status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'converted', 'spam', 'profile_created')),
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME,
      read_by TEXT,
      converted_at DATETIME,
      converted_by TEXT,
      profile_created_at DATETIME,
      profile_created_by TEXT,
      add_to_spam_at DATETIME,
      add_to_spam_by TEXT,
      spam_reason TEXT,
      FOREIGN KEY (read_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (converted_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (add_to_spam_by) REFERENCES Users (id) ON DELETE SET NULL,
      FOREIGN KEY (profile_created_by) REFERENCES Users (id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_inbox_status_created ON Inbox (status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_inbox_type ON Inbox (inquiry_type)`,
  `CREATE INDEX IF NOT EXISTS idx_inbox_email ON Inbox (email)`,
  `CREATE INDEX IF NOT EXISTS idx_inbox_phone ON Inbox (phone)`,
  `CREATE INDEX IF NOT EXISTS idx_inbox_converted_by ON Inbox (converted_by)`,
  `CREATE INDEX IF NOT EXISTS idx_inbox_read_by ON Inbox (read_by)`,
  `CREATE INDEX IF NOT EXISTS idx_inbox_profile_created_by ON Inbox (profile_created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_inbox_add_to_spam_by ON Inbox (add_to_spam_by)`
];

// Create all tables respecting FK dependency order
beforeAll(async () => {
  await env.DB.batch(createStatements.map(stmt => env.DB.prepare(stmt)));
});

const deleteStatements = [
  `DELETE FROM Inbox`,
  `DELETE FROM Notifications`,
  `DELETE FROM Article_Comments`,
  `DELETE FROM Bookings`,
  `DELETE FROM Articles`,
  `DELETE FROM Article_Categories`,
  `DELETE FROM Customers`,
  `DELETE FROM Media`,
  `DELETE FROM Business_Settings`,
  `DELETE FROM Services`,
  `DELETE FROM service_category`,
  `DELETE FROM ApiKeys`,
  `DELETE FROM VerificationCodes`,
  `DELETE FROM Sessions`,
  `DELETE FROM Users`
];

// Clean all tables in reverse dependency order
beforeEach(async () => {
  await env.DB.batch(deleteStatements.map(stmt => env.DB.prepare(stmt)));
});
