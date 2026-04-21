# Technical Specification & Plan: J-W1-P3-T2

## Objective
Implement Track 2 of Phase 3 for the Closepilot project, focusing on Advanced Analytics & Telemetry.

## Components to Implement

### 1. Shared Types (`packages/core/src/types/analytics.ts`)
Define `StageVelocity` and `ConversionStats` interfaces and export them.

### 2. Analytics Queries (`packages/db/src/queries/analytics.ts`)
Implement `getDealVelocity()` and `getConversionStats()`.

### 3. Analytics API Routes (`packages/api/src/routes/analytics.ts`)
Create GET endpoints `/api/analytics/velocity` and `/api/analytics/conversion`.

### 4. Dashboard UI (`packages/web/components/dashboard/VelocityChart.tsx`)
Create a React client component using `recharts` to render a bar chart of stage velocity.

### 5. Wire into Dashboard (`packages/web/app/page.tsx`)
Embed `VelocityChart` in the dashboard pipeline page.

### 6. Tests
Add unit tests for the analytics API routes.
