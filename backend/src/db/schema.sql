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
  weekend_surcharge_percent NUMERIC(5, 2) DEFAULT 0.00,
  -- Occupancy policy, per property and set from the admin panel.
  --
  -- Rates are quoted for two adults per room. A third ADULT adds
  -- extra_adult_percent of that night's room rate ("double occupancy room ka 40%
  -- increase hoga triple mein"). A child adds nothing — child_free_under_age
  -- defaults to 18 so that "if it's child then no" holds at any age, and can be
  -- lowered by a hotel that wants to charge for older children.
  extra_adult_percent NUMERIC(5, 2) NOT NULL DEFAULT 40.00,
  child_free_under_age INTEGER NOT NULL DEFAULT 18,
  -- Null until a real coordinate is confirmed for the property. The UI falls
  -- back to an address search rather than showing an invented pin.
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  place_id VARCHAR(128),
  tier VARCHAR(32) DEFAULT 'central',
  tier_label VARCHAR(64) DEFAULT 'Quadis Central'
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
  breakfast_offset NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  all_meals_offset NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_units INTEGER NOT NULL DEFAULT 5,
  available_units INTEGER NOT NULL DEFAULT 5,
  is_available BOOLEAN DEFAULT TRUE,
  CONSTRAINT check_available_positive CHECK (available_units >= 0 AND available_units <= total_units)
);

-- Guest accounts. password_hash holds a salted scrypt digest, never plaintext.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(190) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code VARCHAR(16) UNIQUE NOT NULL,
  -- Null for guest checkout; set when a signed-in guest books.
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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
  -- guests_count stays as the headcount total (adults + children) so older rows
  -- and the owner WhatsApp alert keep working. The split below is what prices
  -- the stay: adults beyond two per room pay the extra-bed charge.
  guests_count INTEGER NOT NULL DEFAULT 2,
  adults_count INTEGER NOT NULL DEFAULT 2,
  children_count INTEGER NOT NULL DEFAULT 0,
  -- One age per child, so "under 12 stays free" can be recomputed on any row
  -- rather than trusting a number the client sent.
  child_ages JSONB NOT NULL DEFAULT '[]'::jsonb,
  extra_adults INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_mode VARCHAR(32) NOT NULL DEFAULT 'INSTANT_FULL_PAYMENT',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  razorpay_order_id VARCHAR(64),
  razorpay_payment_id VARCHAR(64),
  razorpay_payment_link_id VARCHAR(64),
  booking_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A payment may only ever settle one booking. Razorpay retries webhooks on
-- timeout, so without this a replayed payment.captured can confirm twice.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_razorpay_payment_id_key
  ON bookings (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- Availability is per night, not a single counter per room type.
--
-- One row per room type, per night, per booking. A stay from the 1st to the 3rd
-- occupies the nights of the 1st and 2nd — the checkout date is not a night.
-- Without this, a booking in December made rooms unbookable in March.
CREATE TABLE IF NOT EXISTS room_night_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id VARCHAR(64) NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stay_date DATE NOT NULL,
  units INTEGER NOT NULL CHECK (units > 0)
);

CREATE INDEX IF NOT EXISTS room_night_holds_lookup
  ON room_night_holds (room_type_id, stay_date);
CREATE UNIQUE INDEX IF NOT EXISTS room_night_holds_unique
  ON room_night_holds (booking_id, stay_date);

CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings(booking_status, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code);

CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_type VARCHAR(32) NOT NULL,
  property_id VARCHAR(64) REFERENCES properties(id),
  guest_name VARCHAR(128) NOT NULL,
  guest_phone VARCHAR(20) NOT NULL,
  guest_email VARCHAR(128),
  event_date DATE,
  guest_count INTEGER,
  message TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'NEW',
  razorpay_payment_link_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status_created ON enquiries(status, created_at);

-- Editable marketing copy.
--
-- Page text used to live only in the JSX, so changing a headline meant a code
-- change and a redeploy. Components read a key from here and fall back to the
-- string they shipped with, so an empty table renders exactly today's site and
-- the admin can override any block without a deploy.
CREATE TABLE IF NOT EXISTS site_content (
  key VARCHAR(128) PRIMARY KEY,
  value TEXT NOT NULL,
  -- Free-text grouping for the admin UI ("home", "about", "footer"…).
  section VARCHAR(64) NOT NULL DEFAULT 'general',
  label VARCHAR(190) NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_content_section ON site_content(section);

CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(64) NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  tools_invoked JSONB,
  handoff_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_session ON chat_logs(session_id);

-- ---------------------------------------------------------------------------
-- Migrations for databases created before a column existed.
--
-- Every CREATE TABLE above is IF NOT EXISTS, which means an existing database
-- silently keeps its old shape. These run on every boot and are no-ops once
-- applied, so a redeploy onto a live database picks the new columns up.
-- ---------------------------------------------------------------------------

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS adults_count INTEGER NOT NULL DEFAULT 2;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS children_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS child_ages JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extra_adults INTEGER NOT NULL DEFAULT 0;

-- The uplift applied to each extra bed, frozen onto the booking at the time it
-- was made: the percentage in force, and the rupees per extra adult per night it
-- worked out to. Without these, an admin repricing the property later would
-- change what an already-issued invoice appears to say.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extra_adult_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extra_adult_charge NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE properties ADD COLUMN IF NOT EXISTS extra_adult_percent NUMERIC(5, 2) NOT NULL DEFAULT 40.00;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS child_free_under_age INTEGER NOT NULL DEFAULT 18;

-- Databases created against the earlier flat-rupee model carry a redundant
-- properties.extra_adult_charge column. Harmless if present; dropped so the
-- schema has exactly one definition of the policy.
ALTER TABLE properties DROP COLUMN IF EXISTS extra_adult_charge;
