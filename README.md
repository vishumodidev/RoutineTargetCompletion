# RoutineTargetCompletion (Personal AI Operating System)

A production-grade Personal AI Productivity and Habit Tracking Operating System built on **React 19 + Vite 8** with **Google Sheets / Google Apps Script** as a serverless database backend, featuring deterministic priority scoring, capacity-aware daily planning, review cycles, Google Calendar & Google Tasks synchronization, and server-side Gemini 2.5 Flash AI reasoning.

---

## 1. Verified Architecture & Feature Matrix

| Subsystem | Architecture & Stack | Verification Status |
| :--- | :--- | :--- |
| **Task Management** | 26-column unified schema in Google Sheets (`Tasks`) + React Context (`TaskContext`) | Verified (12/12 tests passing) |
| **Priority Engine** | Deterministic 5-factor mathematical formula ($0–100$ scale) | Verified (16/16 tests passing) |
| **Daily Big 5 Planner** | Capacity-bounded task selector ($\le 5$ tasks) with day types | Verified (15/15 tests passing) |
| **Review Cycles** | Guided Morning, Evening, and Weekly Review workflows | Verified (13/13 tests passing) |
| **Google Calendar** | Timed & all-day event parsing, interval union merging, capacity deductions | Verified (11/11 tests passing) |
| **Google Tasks** | Schema mapping, category assignment, deduplication | Verified (mocked / ready for client ID) |
| **AI Assistant Layer** | Gemini 2.5 Flash server-side proxy via Google Apps Script with heuristic fallback | Verified (20/20 tests passing) |
| **E2E & Analytics** | 12-step lifecycle verification & factual execution analytics | Verified (15/15 tests passing) |
| **Controlled Automations** | Deterministic workflows, human approval queue & audit logs (`AutomationRuns`) | Verified (13/13 tests passing) |
| **Opportunity Pipeline** | Sales funnel, deal stages, probability forecasting & task elevation | Verified (13/13 tests passing) |
| **AI Business Mentor** | Daily planner, deal diagnostics, 5 proposal drafts, zero-conflation income review | Verified (14/14 tests passing) |
| **Adversarial QA Suite** | Boundary values, deadlock resilience, prompt injection, zero conflation | Verified (30/30 tests passing) |
| **Total Test Suite** | Node.js ESM test runner (`node --test`) | **172 / 172 Tests Passing (100%)** |

---

## 2. Mathematical Formulas & Rules

### A. Deterministic Priority Engine
$$\text{Priority Score} = 0.30(U) + 0.25(G) + 0.20(I) + 0.15(D) + 0.10(R)$$
- **Deadline Urgency ($U \in [0, 100]$)**: Overdue (85–100), due today (80–95), due tomorrow (65–85), due this week (35–55), flexible/none (20), completed (0). If a task lacks an explicit due date but is linked to an opportunity, it dynamically inherits the opportunity's expected close date.
- **Goal Alignment ($G \in [0, 100]$)**: Linked Critical goal (100), High goal (85), Medium goal (65), Low goal (45), unlinked strategic category (40), general (25).
- **Income Impact ($I \in [0, 100]$)**: Linked Confirmed/Won deal (100), high-value deal $\ge \text{₹}80\text{k}$ (95), deal $\ge \text{₹}35\text{k}$ (80), deal $\ge \text{₹}15\text{k}$ (65), base client opportunity (50), manual High/Medium/Low tags (95/65/35).
- **Dependency Importance ($D \in [0, 100]$)**: Blocks $\ge 3$ tasks (100), blocks 2 tasks (85), blocks 1 task (70), independent (50), blocked (10).
- **Readiness ($R \in [0, 100]$)**: Blocked/Completed (0), ready with next action & duration (90), baseline (70).

### B. Opportunity Pipeline & Revenue Forecasting
Zero-conflation guarantee: open pipeline values and probability forecasts are never mixed with realized revenue.
- **Actual Realized Revenue**: Strictly $\sum \text{Value}$ where $\text{Stage} \in \{\text{Confirmed}, \text{Closed-Won}\}$.
- **Open Pipeline Total**: $\sum \text{Value}$ where $\text{Stage} \notin \{\text{Confirmed}, \text{Lost}\}$.
- **Weighted Pipeline Forecast**: $\sum \left( \text{Value} \times \frac{\text{Probability}}{100} \right)$ for all active open opportunities.
- **Standard Stage Probabilities**: `New Leads` (10%), `Qualified Leads` (30%), `Meetings` (50%), `Proposals` (70%), `Negotiations` (80%), `Confirmed` (100%), `Lost` (0%).
- **Win Rate**: $\frac{N_{\text{Won}}}{N_{\text{Won}} + N_{\text{Lost}}} \times 100\%$ (Active open deals are excluded from win-rate denominator).

### C. Execution Analytics
- **Task Completion Rate**: $\frac{N_{\text{Completed}}}{N_{\text{Total}} - N_{\text{Cancelled}}} \times 100\%$ (Cancelled & deferred tasks are never counted as completed).
- **Daily Plan Completion Rate**: $\frac{N_{\text{Completed Planned Tasks}}}{N_{\text{Accepted Planned Tasks}}} \times 100\%$.
- **Estimation Variance**: $\frac{\sum \text{Actual Minutes} - \sum \text{Estimated Minutes}}{\sum \text{Estimated Minutes}} \times 100\%$ (Strictly calculated on tasks with logged actual duration; never estimated or fabricated).

---

## 3. Security & Data Integrity

1. **Server-Side Credential Isolation**:
   - `GEMINI_API_KEY` is stored **strictly** in Google Apps Script `ScriptProperties` (`PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY")`). It is never bundled in frontend assets or exposed in network traffic.
   - If `GEMINI_API_KEY` is not configured, the assistant automatically uses deterministic heuristic algorithms without throwing errors.
2. **Database Authorization**:
   - Every read and write operation in `backend/Code.js` validates `existing.UserID == userId` to prevent cross-user data tampering.
3. **In-Memory OAuth Tokens**:
   - Google Calendar and Tasks access tokens from Google Identity Services (GIS) are held strictly in JavaScript memory and cleared on tab reload or disconnect.
4. **Prompt Injection & Output Validation**:
   - User task titles and notes are isolated in `<untrusted_content>` tags.
   - All AI responses are validated against strict JSON schemas before being accepted.

---

## 4. Controlled Automation & Human-in-the-Loop Safety Model (Phase 8)

The application implements deterministic automated workflows governed by strict permission categories:

### A. Approved Workflows
1. **Morning Planning Preparation (`auto_morning_plan`)**: Generates proposed Daily Big 5 based on priority formula and calendar bookings. **Tier: DRAFT**. Never overwrites an accepted daily plan without explicit approval.
2. **Evening Review Preparation (`auto_evening_review`)**: Summarizes planned vs completed tasks, formats standard deferral notes, and drafts reflection text. **Tier: DRAFT**. Never marks tasks completed autonomously.
3. **Follow-up Task Suggestions (`auto_followup_suggestions`)**: Identifies overdue tasks ($\ge 2$ days), unresolved blockers, and unlinked strategic goals. Generates proposal cards in the approval queue. **Tier: USER_APPROVED_WRITE**.
4. **Weekly Review Preparation (`auto_weekly_review`)**: Synthesizes factual metrics, ISO week progress, duration accuracy, and stalled goals. **Tier: DRAFT**.

### B. Permission Policy & Restricted Actions
| Action Category | Policy & Behavior | Example Actions |
| :--- | :--- | :--- |
| **READ_ONLY** | Unrestricted read access within authenticated user scope | `getTasks`, `getDailyPlan`, `getReviews` |
| **DRAFT** | Generates in-memory recommendations; zero database mutation | `draft_daily_plan`, `draft_review` |
| **USER_APPROVED_WRITE** | Requires explicit user token/button press in the UI | `create_task`, `save_daily_plan`, `save_review` |
| **RESTRICTED** | **Permanently blocked** at engine and backend level | `delete_task`, `send_email`, `execute_financial_tx`, `modify_external_calendar` |

### C. Idempotency & Master Switch
- **Deduplication Key**: `auto_{workflowType}_{userId}_{dateKey}`. Duplicate automatic triggers return cached results rather than generating redundant runs.
- **Emergency Master Switch**: Allows immediate local pause/resume of all background triggers (`localStorage.rtc_automations_enabled`).
- **Apps Script Time-Driven Triggers**: For headless execution, run `setupAutomationTriggers()` in `backend/Code.js` to enable automatic 06:00 AM morning drafts. Persistent writes remain strictly queued until user approval.

---

## 5. Personal AI Business Mentor (Phase 10)

The application includes an executive Personal AI Business Mentor designed to guide daily high-leverage execution, diagnose sales pipeline health, draft communications, and keep income milestones on track with strict safety guardrails.

### A. Core Architecture & Safety Boundaries
1. **Server-Side Credential Isolation**:
   - Provider credentials (`GEMINI_API_KEY`) reside exclusively on the server in Google Apps Script `ScriptProperties`.
   - Never exposed in frontend bundles, browser memory, or localStorage.
2. **Deterministic Heuristic Fallbacks (Zero LLM Dependency)**:
   - 100% operational offline. If the AI gateway is unreachable or unconfigured, the system seamlessly uses deterministic heuristic engines (`mentorEngine.js`).
3. **Controlled Context Builder**:
   - Sanitizes and minimizes context: active tasks capped at 15, opportunities capped at 10, goals at 5.
   - Text fields truncated to safe lengths; external emails and tokens stripped.
   - Untrusted user input delimited in `<untrusted_content>` XML tags to prevent prompt injection.
   - Missing data flags are explicitly signaled to the model.
4. **Strict Zero-Conflation Guarantee**:
   - Open pipeline values and probability-weighted forecasts are strictly separated from realized revenue. Unearned pipeline is never counted toward confirmed income.
5. **Strict Human-in-the-Loop Writing Policy**:
   - Proposal drafts and client emails are generated proposals only. Zero automatic sending is permitted. All drafts are editable and require explicit human review and delivery.

### B. Six Executive Mentor Capabilities
1. **Daily Plan Assistant (`getDailyPlanProposal`)**:
   - Selects up to 5 highest-priority tasks based on authoritative Priority Engine scores.
   - Recommends feasible actions respecting available minutes after routine blocks and Google Calendar meetings.
   - Explains the strategic reason why each action matters.
   - One-click "Apply Focus to Today" button updates the Daily Big 5.
2. **Opportunity Pipeline Mentor (`getOpportunityAdvice`)**:
   - Diagnoses deal health across 4 stages (`HEALTHY`, `AT_RISK`, `STALLED`, `DECAYING`).
   - Flags overdue follow-ups ($\ge 7$ days without contact) with concrete remediation steps.
   - Formulates 3 tailored discovery questions for early-stage prospects.
3. **Proposal & Communication Drafter (`draftProposalOrComms`)**:
   - Generates grounded, professional drafts across 5 approved categories:
     - `training_proposal`: Corporate / AI upskilling curriculum and commercial terms.
     - `software_proposal`: Custom software development / MVP scoping and deliverables.
     - `followup_email`: High-leverage executive follow-up communication.
     - `meeting_agenda`: Discovery and executive alignment agenda.
     - `discovery_questionnaire`: Diagnostic questions to qualify project requirements.
   - Includes live editable textarea, copy-to-clipboard, Stated Assumptions cards, and Missing Information warnings.
4. **Income Goal Review (`getIncomeGoalReview`)**:
   - Compares verified confirmed revenue against monthly targets.
   - Displays unweighted open pipeline and probability-weighted pipeline without mixing.
   - Recommends concrete actions to close the gap to target.
5. **Factual Evening Review (`getEveningReviewAdvice`)**:
   - Summarizes planned vs completed tasks and celebrates progress without streaks penalties.
   - Analyzes friction/blocker patterns and proposes top candidate tasks for tomorrow.
6. **Strategic Weekly Synthesis (`getWeeklyReviewAdvice`)**:
   - Synthesizes weekly progress, identifies recurring bottlenecks, and proposes the top 3 strategic priorities for the upcoming week.

---

## 6. Environment Configuration

Copy `.env.example` to `.env`:
```bash
# Google Apps Script Web App URL (doGet & doPost backend)
VITE_API_URL=https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec

# Optional: Google Cloud OAuth 2.0 Client ID (Web Application / SPA)
# Required for live Google Calendar & Google Tasks synchronization
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# NOTE: NEVER put GEMINI_API_KEY in .env. Configure it in Apps Script ScriptProperties.
```

---

## 7. Verification Commands

Run the full automated test suite:
```bash
npm test
```
*Expected: 172 tests pass across 69 suites in ~2.5s.*

Run the production build:
```bash
npm run build
```
*Expected: Vite production bundle compiles cleanly to `dist/` in $< 3\text{s}$.*

---

## 8. Production Deployment Runbook (Netlify)

1. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
2. **SPA Routing**:
   - Verified via `netlify.toml` and `public/_redirects` (`/* /index.html 200`).
3. **Environment Variables**:
   - Add `VITE_API_URL` pointing to your deployed Google Apps Script Web App.
   - Optional: Add `VITE_GOOGLE_CLIENT_ID` for live Google Calendar sync.

---

## 9. Backup and Rollback Runbook

1. **Google Sheets Database Backup**:
   - **Version History (Built-in)**: Open Google Sheet $\rightarrow$ **File** $\rightarrow$ **Version History** $\rightarrow$ **See Version History**. Any historical state can be restored with a single click.
   - **Manual Export**: Go to **File** $\rightarrow$ **Download** $\rightarrow$ **Comma Separated Values (.csv)** for `Tasks`, `DailyPlans`, `Reviews`, `Opportunities`, and `Users`.
2. **Application Code Rollback**:
   - Code is versioned in Git. To revert:
     ```bash
     git revert HEAD
     npm test
     npm run build
     ```
3. **Google Apps Script Rollback**:
   - Open Apps Script Editor $\rightarrow$ **Deploy** $\rightarrow$ **Manage Deployments** $\rightarrow$ Select prior version $\rightarrow$ Save.

---

## 10. Known Limitations & Future Improvements
- **Password Hashing**: Passwords in Google Sheets are stored in plaintext for demonstration simplicity. For enterprise production, migrate to Firebase Authentication or SHA-256 with salt hashing.
- **Apps Script Rate Limits**: Google Apps Script free quota allows 20,000 URL fetches/day and 6 minutes execution/call. The application optimizes this by caching state in React context and minimizing backend calls.
