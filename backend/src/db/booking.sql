-- ==========================================
-- AuraDash Booking Schema
-- ==========================================

-- 1. Bookings Table
-- Stores all appointments, service requests, and schedule blocks for customers.
CREATE TABLE IF NOT EXISTS Bookings (
    id TEXT PRIMARY KEY,                       -- Unique identifier (UUIDv4)
    booking_number TEXT UNIQUE,                -- Custom unique booking reference code (e.g. BK-XXXXXX)
    customer_id TEXT NOT NULL,                 -- Foreign key referencing the Customer who made the booking
    scheduled_from DATETIME,                   -- Start date and time of the booking (can be empty)
    scheduled_to DATETIME,                     -- End date and time of the booking (can be empty)
    services_data TEXT NOT NULL,               -- JSON string containing the snapshot of services requested, prices, and discounts
    status TEXT DEFAULT 'pending',             -- Status of the booking (e.g., 'pending', 'confirmed', 'completed', 'cancelled')
    notes TEXT,                                -- Optional admin notes or special instructions for the appointment
    
    -- Financial Tracking
    paid_status TEXT DEFAULT 'unpaid',         -- Payment status (e.g., 'unpaid', 'partial', 'paid')
    paid_amount REAL DEFAULT 0.0,              -- Amount paid so far for this specific booking
    total_paid REAL DEFAULT 0.0,               -- Total expected amount or aggregated payment
    payment_history TEXT DEFAULT '[]',         -- JSON array of payment logs: [{ date: string, amount: number, added_by: string, notes: string }]
    
    -- Audit & Lifecycle Tracking
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the booking was created
    created_by TEXT NOT NULL,                  -- ID of the user (admin/staff) who created the booking
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp of the last update
    updated_by TEXT,                           -- ID of the user who last modified the booking
    
    completed_at DATETIME,                     -- Timestamp when the booking was marked as completed
    completed_by TEXT,                         -- ID of the user who marked it as completed
    
    cancelled_at DATETIME,                     -- Timestamp when the booking was cancelled
    cancelled_by TEXT,                         -- ID of the user who cancelled the booking
    cancellation_reason TEXT,                  -- Reason provided for the cancellation
    
    -- Foreign Key Constraints
    FOREIGN KEY (customer_id) REFERENCES Customers (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (completed_by) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (cancelled_by) REFERENCES Users (id) ON DELETE SET NULL
);

-- ==========================================
-- Indexes for Performance Optimization
-- ==========================================

-- Optimize dashboard queries and status filters
CREATE INDEX IF NOT EXISTS idx_bookings_status ON Bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON Bookings (booking_number);

-- Optimize calendar and schedule range queries
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_from ON Bookings (scheduled_from);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_to ON Bookings (scheduled_to);

-- Optimize customer history and lookup queries
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON Bookings (customer_id);

-- Optimize audit queries for staff performance tracking
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON Bookings (created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_completed_by ON Bookings (completed_by);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by ON Bookings (cancelled_by);

-- Optimize sorting and audit checks
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON Bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_by ON Bookings (updated_by);
