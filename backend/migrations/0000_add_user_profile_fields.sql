-- 1. جدول المستخدمين (المديرين والموظفين)
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Admin', 'User')),
    permissions JSON,
    is_active INTEGER DEFAULT 1,
    is_banned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role ON Users(role);

-- 2. جدول الجلسات (بديل الـ JWT للأمان والتحكم الفوري)
CREATE TABLE Sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    is_revoked INTEGER DEFAULT 0,
    user_agent TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user_id ON Sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON Sessions(expires_at);

-- 3. جدول إعدادات النشاط التجاري (لتغذية صفحة الهبوط)
CREATE TABLE Business_Settings (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    logo_url TEXT,
    contact_info JSON,
    working_hours JSON,
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'UTC',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. جدول الخدمات والعروض (يتحكم فيه العميل من اللوحة)
CREATE TABLE Services (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0.0,
    is_active INTEGER DEFAULT 1,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_services_is_active ON Services(is_active);

-- 5. جدول العملاء (الذين يقومون بالحجز)
CREATE TABLE Customers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customers_phone ON Customers(phone);
CREATE INDEX idx_customers_email ON Customers(email);

-- 6. جدول الحجوزات والعمليات
CREATE TABLE Bookings (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    appointment_date DATETIME NOT NULL,
    status TEXT NOT NULL CHECK(
        status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')
    ),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customers(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES Services(id) ON DELETE CASCADE
);
CREATE INDEX idx_bookings_customer_id ON Bookings(customer_id);
CREATE INDEX idx_bookings_service_id ON Bookings(service_id);
CREATE INDEX idx_bookings_status ON Bookings(status);
CREATE INDEX idx_bookings_appointment_date ON Bookings(appointment_date);

-- 7. جدول أكواد التحقق (لاستعادة كلمة المرور وغيرها)
CREATE TABLE VerificationCodes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
CREATE INDEX idx_verification_user_id ON VerificationCodes(user_id);
CREATE INDEX idx_verification_code ON VerificationCodes(code);