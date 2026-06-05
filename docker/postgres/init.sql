-- ============================================================
-- PostgreSQL Initialization Script
-- Runs only on first startup (data directory is empty)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schema for application tables (if needed beyond Prisma defaults)
-- Prisma will create its own tables, this is for custom extensions
CREATE SCHEMA IF NOT EXISTS analytics;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE wheel_hub_platform TO wheel_hub_user;
GRANT ALL ON SCHEMA public TO wheel_hub_user;
GRANT ALL ON SCHEMA analytics TO wheel_hub_user;
