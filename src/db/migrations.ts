// Schema changes, applied in order and recorded in sufra._migrations.
// Money is stored in minor units (halalas, piastres) as integers.

export const migrations: { name: string; sql: string }[] = [
  {
    name: "001_init",
    sql: `
CREATE TABLE sufra.restaurants (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  tagline_ar text,
  tagline_en text,
  currency text NOT NULL DEFAULT 'SAR',
  vat_bps integer NOT NULL DEFAULT 1500 CHECK (vat_bps BETWEEN 0 AND 5000),
  service_bps integer NOT NULL DEFAULT 0 CHECK (service_bps BETWEEN 0 AND 5000),
  prices_include_vat boolean NOT NULL DEFAULT true,
  show_calories boolean NOT NULL DEFAULT true,
  vat_number text,
  timezone text NOT NULL DEFAULT 'Asia/Riyadh',
  default_lang text NOT NULL DEFAULT 'ar' CHECK (default_lang IN ('ar', 'en')),
  warn_after_min integer NOT NULL DEFAULT 10,
  late_after_min integer NOT NULL DEFAULT 20,
  pin_hash text NOT NULL,
  -- Demo restaurants show their throwaway PIN so visitors can try signing in; real ones never store it.
  demo_pin text,
  is_demo boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  ip_hash text,
  version bigint NOT NULL DEFAULT 1,
  order_seq integer NOT NULL DEFAULT 0,
  order_day text,
  sim_enabled boolean NOT NULL DEFAULT false,
  sim_next_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX restaurants_demo_expiry ON sufra.restaurants (expires_at) WHERE is_demo;

CREATE TABLE sufra.stations (
  id text PRIMARY KEY,
  restaurant_id text NOT NULL REFERENCES sufra.restaurants (id) ON DELETE CASCADE,
  key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  UNIQUE (restaurant_id, key)
);

CREATE TABLE sufra.categories (
  id text PRIMARY KEY,
  restaurant_id text NOT NULL REFERENCES sufra.restaurants (id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  sort integer NOT NULL DEFAULT 0
);
CREATE INDEX categories_restaurant ON sufra.categories (restaurant_id, sort);

CREATE TABLE sufra.items (
  id text PRIMARY KEY,
  restaurant_id text NOT NULL REFERENCES sufra.restaurants (id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES sufra.categories (id) ON DELETE CASCADE,
  station_id text REFERENCES sufra.stations (id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  desc_ar text,
  desc_en text,
  price integer NOT NULL CHECK (price >= 0),
  calories integer CHECK (calories >= 0),
  tags text[] NOT NULL DEFAULT '{}',
  photo text,
  available boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX items_restaurant ON sufra.items (restaurant_id, category_id, sort);

CREATE TABLE sufra.option_groups (
  id text PRIMARY KEY,
  item_id text NOT NULL REFERENCES sufra.items (id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  min_select integer NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select integer NOT NULL DEFAULT 1 CHECK (max_select >= 1),
  sort integer NOT NULL DEFAULT 0,
  CHECK (min_select <= max_select)
);
CREATE INDEX option_groups_item ON sufra.option_groups (item_id, sort);

CREATE TABLE sufra.options (
  id text PRIMARY KEY,
  group_id text NOT NULL REFERENCES sufra.option_groups (id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  price_delta integer NOT NULL DEFAULT 0,
  calories_delta integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  sort integer NOT NULL DEFAULT 0
);
CREATE INDEX options_group ON sufra.options (group_id, sort);

CREATE TABLE sufra.tables (
  id text PRIMARY KEY,
  restaurant_id text NOT NULL REFERENCES sufra.restaurants (id) ON DELETE CASCADE,
  label text NOT NULL,
  token text NOT NULL UNIQUE,
  seats integer NOT NULL DEFAULT 4,
  area_ar text,
  area_en text,
  x integer NOT NULL DEFAULT 0,
  y integer NOT NULL DEFAULT 0,
  shape text NOT NULL DEFAULT 'square' CHECK (shape IN ('square', 'round', 'long')),
  sort integer NOT NULL DEFAULT 0,
  UNIQUE (restaurant_id, label)
);

-- A party's visit to a table: everything ordered on one bill.
CREATE TABLE sufra.sessions (
  id text PRIMARY KEY,
  restaurant_id text NOT NULL REFERENCES sufra.restaurants (id) ON DELETE CASCADE,
  table_id text NOT NULL REFERENCES sufra.tables (id) ON DELETE CASCADE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  total integer
);
CREATE UNIQUE INDEX sessions_one_open_per_table ON sufra.sessions (table_id) WHERE closed_at IS NULL;
CREATE INDEX sessions_restaurant ON sufra.sessions (restaurant_id, opened_at DESC);

-- One round of ordering from a table: a kitchen ticket.
CREATE TABLE sufra.orders (
  id text PRIMARY KEY,
  restaurant_id text NOT NULL REFERENCES sufra.restaurants (id) ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES sufra.sessions (id) ON DELETE CASCADE,
  table_id text NOT NULL REFERENCES sufra.tables (id) ON DELETE CASCADE,
  number integer NOT NULL,
  round integer NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'served', 'cancelled')),
  idem_key text NOT NULL,
  subtotal integer NOT NULL,
  source text NOT NULL DEFAULT 'guest' CHECK (source IN ('guest', 'staff', 'sim')),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  cancelled_at timestamptz,
  UNIQUE (restaurant_id, idem_key)
);
CREATE INDEX orders_live ON sufra.orders (restaurant_id, status) WHERE status IN ('new', 'preparing', 'ready');
CREATE INDEX orders_session ON sufra.orders (session_id, round);
CREATE INDEX orders_day ON sufra.orders (restaurant_id, created_at);

CREATE TABLE sufra.order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES sufra.orders (id) ON DELETE CASCADE,
  item_id text REFERENCES sufra.items (id) ON DELETE SET NULL,
  station_key text,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  qty integer NOT NULL CHECK (qty BETWEEN 1 AND 50),
  unit_price integer NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  note text,
  done_at timestamptz,
  sort integer NOT NULL DEFAULT 0
);
CREATE INDEX order_items_order ON sufra.order_items (order_id, sort);

-- "Call a waiter" and "bring the bill".
CREATE TABLE sufra.requests (
  id text PRIMARY KEY,
  restaurant_id text NOT NULL REFERENCES sufra.restaurants (id) ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES sufra.sessions (id) ON DELETE CASCADE,
  table_id text NOT NULL REFERENCES sufra.tables (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('waiter', 'bill')),
  payment text CHECK (payment IN ('cash', 'card')),
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz
);
CREATE UNIQUE INDEX requests_one_open ON sufra.requests (session_id, kind) WHERE acknowledged_at IS NULL;
CREATE INDEX requests_open ON sufra.requests (restaurant_id) WHERE acknowledged_at IS NULL;

-- One-time codes for signing a kitchen screen in by scanning a QR.
CREATE TABLE sufra.pair_codes (
  code text PRIMARY KEY,
  restaurant_id text NOT NULL REFERENCES sufra.restaurants (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

-- Sliding-window rate limits (sign-in attempts, demo creation).
CREATE TABLE sufra.attempts (
  key text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attempts_key ON sufra.attempts (key, at);

CREATE TABLE sufra.app_jobs (
  key text PRIMARY KEY,
  ran_at timestamptz NOT NULL
);
`,
  },
  {
    // Keys the app makes for itself when AUTH_SECRET or RATE_SALT isn't set.
    name: "002_app_keys",
    sql: `
CREATE TABLE sufra.app_keys (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
`,
  },
];
