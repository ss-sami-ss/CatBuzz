-- Runs once on an empty local volume. The test database mirrors the main one for integration tests.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE DATABASE catbuzz_test OWNER catbuzz;
\connect catbuzz_test
CREATE EXTENSION IF NOT EXISTS postgis;
