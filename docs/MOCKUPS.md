# Closepilot UI Mockups & Views

While actual visual mockups are implemented in code, this document describes the core UI views and their layout within the Next.js frontend application.

## 1. The Global Layout
- **Sidebar Navigation:** Contains links to Dashboard, Deals (Kanban), Approvals, Analytics, and Settings.
- **Top Header:** Global search bar (`SearchBar.tsx`), User Profile / Auth state (`AuthNav.tsx`), and notifications.

## 2. Dashboard View
- **Metrics Row:** Key performance indicators (Total Pipeline Value, Deals Won, Active Deals).
- **Velocity Chart (`VelocityChart.tsx`):** A graphical representation of how fast deals are moving through the pipeline stages.
- **Recent Activity:** A condensed version of the real-time activity stream.

## 3. Kanban Board (`KanbanBoard.tsx`)
- **Columns (`KanbanColumn.tsx`):** Represent the different deal stages (`new-lead`, `qualified`, `proposal-pending`, `proposal-sent`, etc.).
- **Deal Cards (`DealCard.tsx`):** Individual draggable cards showing Company Name, Deal Value, Lead Contact, and an ICP Score badge.
- **Filter Bar (`FilterBar.tsx`):** Options to filter the board by Assignee, Value, or ICP Score.

## 4. Deal Detail View (`app/deals/[id]/page.tsx`)
- **Header:** Deal Name, Status Badge, and Primary Actions (e.g., "Approve Proposal", "Reject").
- **Left Pane (Details & Scoping):**
  - `DealStats.tsx`: Financials, probabilities.
  - Extracted requirements and proposed scope.
- **Right Pane (Activity & Comms):**
  - Real-time `ActivityItem.tsx` feed showing every AI action and email received.
  - Email draft preview.

## 5. Approvals Queue (`ApprovalList.tsx`)
- A dedicated list view for all actions that require human intervention.
- Displays the Agent Name, Action Requested (e.g., "Send Proposal to Acme Corp"), and a side-by-side diff if applicable.

## 6. Modals
- **Create Deal Modal (`CreateDealModal.tsx`):** Manual entry form for deals outside the automated ingestion flow.
