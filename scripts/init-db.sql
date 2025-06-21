-- SubPilot Database Initialization Script
-- This script sets up the basic database configuration

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create additional databases for testing
CREATE DATABASE subpilot_test;
CREATE DATABASE subpilot_e2e;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE subpilot_dev TO subpilot;
GRANT ALL PRIVILEGES ON DATABASE subpilot_test TO subpilot;
GRANT ALL PRIVILEGES ON DATABASE subpilot_e2e TO subpilot;