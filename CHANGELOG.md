# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added Drizzle database migration scripts (`db:generate`, `db:migrate`, `db:push`) and baseline configuration.
- Added Fly.io configuration files for production and staging (`fly.api.toml`, `fly.web.toml`, `fly.mcp.toml`).
- Created GitHub Actions workflows for automated deployments, manual deployments, and staging deployments.
- Implemented automated database backups via nightly GitHub Actions cron job.
- Added `backup.sh` and `restore.sh` scripts for PostgreSQL dump operations.
- Implemented `/api/version` endpoint to expose build details (`gitSha`, `builtAt`).
- Added Dockerfile build arguments for passing build-time context to the application runtime.
- Added `docs/RUNBOOK.md` with operational guidance for hot migrations, disaster recovery, and emergency scale-downs.
- Added `markdownlint-cli2` for linting markdown files across the repository.
