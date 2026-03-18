-- Migration: add soft-delete column to orders table
-- Run once: mysql -u root -p paybee < apps/api/scripts/add-order-active.sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
