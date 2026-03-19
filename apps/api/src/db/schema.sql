-- Pay-Bee Marketplace — PostgreSQL Schema
-- Run with: npm run db:init

-- ── Shared trigger function for updated_at ────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── customers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id                  BIGSERIAL        PRIMARY KEY,
  email               VARCHAR(255)     NOT NULL UNIQUE,
  name                VARCHAR(255)     NULL,
  password            VARCHAR(255)     NULL,
  registration_type   VARCHAR(10)      NOT NULL CHECK (registration_type IN ('GOOGLE','CUSTOM')),
  provider_user_id    VARCHAR(255)     NULL,
  avatar              VARCHAR(512)     NULL,
  active              BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── refresh_tokens ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           BIGSERIAL        PRIMARY KEY,
  customer_id  BIGINT           NOT NULL,
  token_hash   VARCHAR(255)     NOT NULL,
  expires_at   TIMESTAMPTZ      NOT NULL,
  revoked      BOOLEAN          NOT NULL DEFAULT FALSE,
  deleted_at   TIMESTAMPTZ      NULL DEFAULT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- ── games ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
  id                 BIGSERIAL        PRIMARY KEY,
  title              VARCHAR(255)     NOT NULL,
  slug               VARCHAR(255)     NOT NULL UNIQUE,
  short_description  VARCHAR(500)     NULL,
  long_description   TEXT             NULL,
  developer          VARCHAR(255)     NULL,
  publisher          VARCHAR(255)     NULL,
  genres             JSONB            NOT NULL DEFAULT '[]',
  features           JSONB            NOT NULL DEFAULT '[]',
  platforms          JSONB            NOT NULL DEFAULT '[]',
  release_date       DATE             NULL,
  steam_app_id       VARCHAR(20)      NULL,
  cover_img_url      VARCHAR(512)     NULL,
  trailer_video_url  VARCHAR(512)     NULL,
  screenshots        JSONB            NOT NULL DEFAULT '[]',
  price_usd          DECIMAL(10,2)    NOT NULL,
  price_lkr          DECIMAL(12,2)    NOT NULL,
  fx_rate_used       DECIMAL(10,4)    NOT NULL,
  discount_percent   SMALLINT         NOT NULL DEFAULT 0,
  price_updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  big_banner         BOOLEAN          NOT NULL DEFAULT FALSE,
  active             BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── cart_items ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id           BIGSERIAL        PRIMARY KEY,
  customer_id  BIGINT           NOT NULL,
  game_id      BIGINT           NOT NULL,
  active       BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cart_customer_game UNIQUE (customer_id, game_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (game_id)     REFERENCES games(id)
);

CREATE OR REPLACE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── orders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  BIGSERIAL        PRIMARY KEY,
  customer_id         BIGINT           NOT NULL,
  status              VARCHAR(10)      NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRM','CANCELED','DONE')),
  billing_first_name  VARCHAR(100)     NOT NULL,
  billing_last_name   VARCHAR(100)     NOT NULL,
  billing_mobile      VARCHAR(20)      NOT NULL,
  billing_address     VARCHAR(255)     NOT NULL,
  billing_city        VARCHAR(100)     NOT NULL,
  billing_state       VARCHAR(100)     NOT NULL,
  billing_zip         VARCHAR(20)      NOT NULL,
  steam_profile       VARCHAR(255)     NOT NULL,
  steam_friend_code   VARCHAR(50)      NOT NULL,
  active              BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE OR REPLACE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── game_requests ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_requests (
  id            BIGSERIAL        PRIMARY KEY,
  customer_id   BIGINT           NOT NULL,
  request_text  VARCHAR(512)     NOT NULL,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- ── order_items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id               BIGSERIAL        PRIMARY KEY,
  order_id         BIGINT           NOT NULL,
  game_id          BIGINT           NOT NULL,
  price_usd        DECIMAL(10,2)    NOT NULL,
  price_lkr        DECIMAL(12,2)    NOT NULL,
  discount_percent SMALLINT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (game_id)  REFERENCES games(id)
)
