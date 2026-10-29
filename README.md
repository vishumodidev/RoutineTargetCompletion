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
| **Total Test Suite** | Node.js ESM test runner (`node --test`) | **102 / 102 Tests Passing (100%)** |

---

## 2. Mathematical Formulas & Rules

### A. Deterministic Priority Engine
$$\text{Priority Score} = 0.30(U) + 0.25(G) + 0.20(I) + 0.15(D) + 0.10(R)$$
- **Deadline Urgency ($U \in [0, 100]$)**: Overdue (85–100), due today (80–95), due tomorrow (65–85), due this week (35–55), flexible/none (20), completed (0).
- **Goal Alignment ($G \in [0, 100]$)**: Linked Critical goal (100), High goal (85), Medium goal (65), Low goal (45), unlinked strategic category (40), general (25).
- **Income Impact ($I \in [0, 100]$)**: High impact (95), Medium impact (65), Low impact (35), None (15).
- **Dependency Importance ($D \in [0, 100]$)**: Blocks $\ge 3$ tasks (100), blocks 2 tasks (85), blocks 1 task (70), independent (50), blocked (10).
- **Readiness ($R \in [0, 100]$)**: Blocked/Completed (0), ready with next action & duration (90), baseline (70).

### B. Execution Analytics
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

## 4. Environment Configuration

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

## 5. Verification Commands

Run the full automated test suite:
```bash
npm test
```
*Expected: 102 tests pass across 40 suites in $< 1.5\text{s}$.*

Run the production build:
```bash
npm run build
```
*Expected: Vite production bundle compiles cleanly to `dist/` in $< 3\text{s}$.*

---

## 6. Production Deployment Runbook (Netlify)

1. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
2. **SPA Routing**:
   - Verified via `netlify.toml` and `public/_redirects` (`/* /index.html 200`).
3. **Environment Variables**:
   - Add `VITE_API_URL` pointing to your deployed Google Apps Script Web App.
   - Optional: Add `VITE_GOOGLE_CLIENT_ID` for live Google Calendar sync.

---

## 7. Backup and Rollback Runbook

1. **Google Sheets Database Backup**:
   - **Version History (Built-in)**: Open Google Sheet $\rightarrow$ **File** $\rightarrow$ **Version History** $\rightarrow$ **See Version History**. Any historical state can be restored with a single click.
   - **Manual Export**: Go to **File** $\rightarrow$ **Download** $\rightarrow$ **Comma Separated Values (.csv)** for `Tasks`, `DailyPlans`, `Reviews`, and `Users`.
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

## 8. Known Limitations & Future Improvements
- **Password Hashing**: Passwords in Google Sheets are stored in plaintext for demonstration simplicity. For enterprise production, migrate to Firebase Authentication or SHA-256 with salt hashing.
- **Apps Script Rate Limits**: Google Apps Script free quota allows 20,000 URL fetches/day and 6 minutes execution/call. The application optimizes this by caching state in React context and minimizing backend calls.
