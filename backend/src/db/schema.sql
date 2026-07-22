-- Quadis Hotels PostgreSQL Database Schema
-- Phase 1: Core API & Database Foundation

CREATE TABLE IF NOT EXISTS properties (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  city VARCHAR(32) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  email VARCHAR(128) NOT NULL,
  base_price NUMERIC(10, 2) NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 4.50,
  is_active BOOLEAN DEFAULT TRUE,
  weekend_surcharge_percent NUMERIC(5, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS room_types (
  id VARCHAR(64) PRIMARY KEY,
  property_id VARCHAR(64) REFERENCES properties(id) ON DELETE CASCADE,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  size_sqft VARCHAR(32),
  bed_type VARCHAR(64),
  max_guests INTEGER NOT NULL DEFAULT 2,
  price_offset NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_units INTEGER NOT NULL DEFAULT 5,
  available_units INTEGER NOT NULL DEFAULT 5,
  CONSTRAINT check_available_positive CHECK (available_units >= 0 AND available_units <= total_units)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code VARCHAR(16) UNIQUE NOT NULL,
  property_id VARCHAR(64) REFERENCES properties(id),
  room_type_id VARCHAR(64) REFERENCES room_types(id),
  guest_name VARCHAR(128) NOT NULL,
  guest_phone VARCHAR(20) NOT NULL,
  guest_email VARCHAR(128),
  company_name VARCHAR(128),
  gstin VARCHAR(32),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  rooms_count INTEGER NOT NULL DEFAULT 1,
  guests_count INTEGER NOT NULL DEFAULT 2,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_mode VARCHAR(32) NOT NULL DEFAULT 'INSTANT_FULL_PAYMENT',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  razorpay_order_id VARCHAR(64),
  razorpay_payment_id VARCHAR(64),
  razorpay_payment_link_id VARCHAR(64),
  booking_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings(booking_status, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code);
