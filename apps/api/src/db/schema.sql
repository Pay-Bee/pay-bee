-- Pay-Bee Marketplace — MySQL Schema
-- Run with: npm run db:init

CREATE TABLE IF NOT EXISTS customers (
  id                  BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email               VARCHAR(255)     NOT NULL UNIQUE,
  name                VARCHAR(255)     NULL,
  password            VARCHAR(255)     NULL,
  registration_type   ENUM('GOOGLE','CUSTOM') NOT NULL,
  provider_user_id    VARCHAR(255)     NULL,
  avatar              VARCHAR(512)     NULL,
  active              BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE customers ADD COLUMN name VARCHAR(255) NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id  BIGINT UNSIGNED  NOT NULL,
  token_hash   VARCHAR(255)     NOT NULL,
  expires_at   TIMESTAMP        NOT NULL,
  revoked      BOOLEAN          NOT NULL DEFAULT FALSE,
  deleted_at   TIMESTAMP        NULL DEFAULT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS games (
  id                 BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title              VARCHAR(255)      NOT NULL,
  slug               VARCHAR(255)      NOT NULL UNIQUE,
  short_description  VARCHAR(500)      NULL,
  long_description   LONGTEXT          NULL,
  developer          VARCHAR(255)      NULL,
  publisher          VARCHAR(255)      NULL,
  genres             JSON              NOT NULL,
  features           JSON              NOT NULL,
  platforms          JSON              NOT NULL,
  release_date       DATE              NULL,
  steam_app_id       VARCHAR(20)       NULL,
  cover_img_url      VARCHAR(512)      NULL,
  trailer_video_url  VARCHAR(512)      NULL,
  screenshots        JSON              NOT NULL,
  price_usd          DECIMAL(10,2)     NOT NULL,
  price_lkr          DECIMAL(12,2)     NOT NULL,
  fx_rate_used       DECIMAL(10,4)     NOT NULL,
  discount_percent   TINYINT           NOT NULL DEFAULT 0,
  price_updated_at   TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  big_banner         BOOLEAN           NOT NULL DEFAULT FALSE,
  active             BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id  BIGINT UNSIGNED  NOT NULL,
  game_id      BIGINT UNSIGNED  NOT NULL,
  active       BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cart_customer_game (customer_id, game_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (game_id)     REFERENCES games(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                  BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id         BIGINT UNSIGNED  NOT NULL,
  status              ENUM('PENDING','CONFIRM','CANCELED','DONE') NOT NULL DEFAULT 'PENDING',
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
  created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS game_requests (
  id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id   BIGINT UNSIGNED  NOT NULL,
  request_text  VARCHAR(512)     NOT NULL,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id         BIGINT UNSIGNED  NOT NULL,
  game_id          BIGINT UNSIGNED  NOT NULL,
  price_usd        DECIMAL(10,2)    NOT NULL,
  price_lkr        DECIMAL(12,2)    NOT NULL,
  discount_percent TINYINT          NOT NULL DEFAULT 0,
  created_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (game_id)  REFERENCES games(id)
);
