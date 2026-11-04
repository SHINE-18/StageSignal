# StageSignal Implementation Checklist

## Project Status Overview
- **Product:** StageSignal (Real-time stage-to-FOH communication PWA for church worship teams)
- **Primary Source of Truth:** `StageSignal_PRD.md` & PRD Section 21
- **Current Phase:** Phase 7 (Production Deployment & Real-Device Testing) — READY FOR USER DEPLOYMENT AND DEVICE TESTING 🚀
- **Target Architecture:** Vercel (Next.js 15 App Router Edge Hosting) + Convex Cloud Backend

---

## Master Phase Checklist

### Step 0: Project Inspection & Setup [COMPLETED]
- [x] Inspect existing project, files, and package dependencies
- [x] Identify existing dependencies (`next 15.2.0`, `react 19.0.0`, `react-dom 19.0.0`, `convex 1.25.0`, `lucide-react 0.468.0`, `qrcode 1.5.4`)
- [x] Author comprehensive implementation checklist (`CHECKLIST.md`)
- [x] Preserve working code and architecture

---

### Phase 1: Project Foundation, Design Tokens & Responsive Shell [COMPLETED]
- [x] Configure Tailwind CSS with PRD Section 12.2 exact color palette (`#090D18`, `#111827`, `#151D2D`, `#3B82F6`, `#22C55E`, `#F59E0B`, `#EF4444`, `#F8FAFC`, `#94A3B8`)
- [x] Configure Inter typography via `next/font/google` (`--font-inter`)
- [x] Setup global CSS with dark color scheme, safe-area insets (`env(safe-area-inset-*)`), and subtle animations
- [x] Implement Convex database schema matching PRD Section 10 (`rooms`, `participants`, `requests`, `requestEvents`) with all required indexes:
  - `rooms`: `by_code`, `by_status`
  - `participants`: `by_room`, `by_room_and_status`
  - `requests`: `by_room`, `by_participant`, `by_room_and_status`
  - `requestEvents`: `by_request`, `by_room`
- [x] Implement Convex client provider (`app/providers.tsx`) targeting configured cloud deployment with missing URL runtime error guard
- [x] Build reusable responsive shell layout and navigation bar (`components/Navbar.tsx`) supporting 360px, 768px, 1024px+, and 1280px+ viewports
- [x] Fix hydration warnings (`suppressHydrationWarning` on root layout `<html lang="en">` and `<body>`)
- [x] Configure ESLint flat config (`eslint.config.mjs`) ignoring build artifacts
- [x] Run `tsc --noEmit` — 0 errors
- [x] Run `npm run lint` — 0 errors, 0 warnings
- [x] Run `npm run build` — Production build succeeded (0 errors, all 8 routes compiled)
- [x] Test Phase 1 dev server on port 3000 — HTTP 200 OK

---

### Step 0 Token Model Correction & Phase 2 Security Hardening [COMPLETED]
- [x] Bearer Token Model: Client sends raw 64-char token as bearer credential over secure transport (HTTPS)
- [x] Server hashes raw token with SHA-256 (`sha256Hex`) and compares against DB `hostTokenHash` via `timingSafeEqual`
- [x] Removed client-side `sha256Hex` for auth: raw tokens are never written to DB or exposed in queries/logs
- [x] Stored hash rejection verified: passing the stored hash as token fails authentication (`sha256(hash) != hash`)
- [x] Wrong token rejection verified on `endRoom` and `getHostRoom`
- [x] Code collision retry verified (active room collision retry guard with max 5 attempts)
- [x] Cron registered in `convex/crons.ts` (`sweep-overdue-rooms` every 10 minutes)

---

### Phase 3: Musician Joining & Waiting Room [COMPLETED]
- [x] Implemented `convex/participants.ts`:
  - `requestJoin(code, name, instrument, participantToken)`: normalizes room code, returns user-friendly distinct error codes (`ROOM_NOT_FOUND`, `ROOM_ENDED`, `ROOM_EXPIRED`), validates name (1-40 chars), validates instrument against 8 supported types, stores server-hashed token `participantTokenHash`, enforces rate limiting against spam
  - Re-entry protection: removed or rejected participants cannot silently re-enter with the same token; existing pending/approved participants update lastSeenAt without duplicating records
  - Approval isolation: approval never carries across rooms; each room session maintains an isolated participant record
  - `listParticipantsForHost(roomId, hostToken)`: host-only query returning `_id`, `name`, `instrument`, `status`, `joinedAt`, `lastSeenAt`, `isOnline`; never leaks token hashes or raw tokens
  - `approveParticipant(participantId, hostToken)`: host-only mutation enforcing room capacity on the server (`count approved vs room.capacity`), returns `ROOM_FULL` if capacity is reached
  - `rejectParticipant(participantId, hostToken)` and `removeParticipant(participantId, hostToken)`: host-only mutations updating participant status
  - `getParticipantStatus(roomId, participantToken)`: reactive subscription returning that participant's own status, room name, and lifecycle state; returns "please rejoin" for invalid/unknown tokens
  - `getMusicianSession(roomId, participantToken)`: verifies approved status server-side before granting access to `/room/[roomId]/musician`
- [x] Implemented musician profile & room token persistence (`lib/profile.ts`):
  - `getSavedProfile()`, `saveProfile()`, `clearProfile()` storing name and instrument in `localStorage`
  - Per-room isolated token generator: `getOrCreateRoomParticipantToken(roomId)` ensuring approval is never reused across different rooms
  - Wrapped in `try/catch` for Safari private browsing resilience
- [x] Built mobile-first `/join` screen (`app/join/page.tsx`):
  - Dark console UI with PRD 12.2 tokens
  - Live code verification via `getRoomByCode` with clear feedback (`verified`, `ended`, `expired`, `not_found`)
  - 8 supported instrument selectors with min-h-[56px] touch targets
  - Display name input with character validation
  - Remembered profile banner with "Edit" and "Clear remembered profile" controls
  - "Request to Join Stage" CTA with loading indicator and duplicate-submit guard
- [x] Built live reactive `/room/[roomId]/waiting` waiting room (`app/room/[roomId]/waiting/page.tsx`):
  - Zero manual polling; uses Convex WebSocket subscriptions
  - `pending`: Pulsing beacon and informative status
  - `approved`: Instant celebration state and auto-redirect to `/room/[roomId]/musician`
  - `rejected` & `removed`: Distinct clear messaging with link back to `/join`
  - Room ended & expired alerts handled
- [x] Built protected `/room/[roomId]/musician` stage console (`app/room/[roomId]/musician/page.tsx`):
  - Verifies approved status and participant token on the server; redirects unapproved/pending participants to waiting room or join
  - Displays approved musician session card, status banner, and quick cues
- [x] Built live FOH Musician Approval Queue & Stage Roster (`app/room/[roomId]/foh/page.tsx`):
  - Live reactive queue displaying pending musicians with name, instrument, join time, Approve and Reject buttons
  - Real-time updates without refreshing
  - Server-enforced capacity indicator ("Room Full: 8/8 Approved") with disabled approval button and banner feedback
  - Approved Stage Roster displaying live online presence dots and "Remove" action
- [x] Verified via `npx tsc --noEmit` — 0 errors
- [x] Verified via `npm run lint` — 0 errors, 0 warnings
- [x] Verified via `npm run build` — Production build succeeded (0 errors, all 8 routes compiled)
- [x] Tested and verified all security checks:
  - Musician token cannot call host functions (rejected)
  - Pending/rejected participant cannot access musician stage data (blocked)
  - Capacity limit is enforced server-side (3rd approval blocked when capacity=2)
  - Participant token from Room A is isolated and rejected in Room B
  - Queries scrub token hashes and raw tokens from client responses
  - Dev server HTTP 200 OK across all routes

---

### Phase 4: Musician Stage Communication [COMPLETED]
- [x] Mobile-first stage interface (`app/room/[roomId]/musician/page.tsx`) with dark console theme and min-h-[56px] touch targets
- [x] 11 predefined request buttons (More/Less Click, More/Less Me, More/Less Bass, More Drums, More Keys, More Vocal, Can't Hear, SOS)
- [x] Server-enforced preset messages & priorities in `convex/requests.ts`: client cannot spoof urgent priority on standard cues or alter preset text
- [x] SOS urgent button with 2-step confirmation modal, urgent priority, and high-visibility alert treatment
- [x] Custom message input (240 character limit, live counter, empty validation, anti-duplicate submission lock)
- [x] Rate limiting per participant: max 5 requests per 10 seconds; duplicate pending requests within 15 seconds dropped
- [x] Real-time request status banner on musician device (Pending → Acknowledged with "FOH is adjusting your mix" → Resolved)
- [x] Personal request history drawer (`listMyRequests`) strictly isolated to that musician's own cues
- [x] Heartbeat & presence polling every 25 seconds; pauses when backgrounded/hidden
- [x] Offline banner and controls disable on network loss; stale requests never queued

---

### Phase 5: FOH Sound Engineer Console (iPad Landscape) [COMPLETED]
- [x] Purpose-built iPad landscape dashboard (`app/room/[roomId]/foh/page.tsx`) optimized for $\ge 1024\text{px}$ and desktop, responsive down to 360px
- [x] Persistent red urgent SOS alert banner across the top of dashboard when urgent requests are active (remains until acknowledged/resolved) with direct 1-tap actions
- [x] Console header with live digital clock, room name, session type pill, monospace room code with copy, fullscreen QR modal trigger, and session controls
- [x] Real-time statistics bar: Stage Roster (`approved / capacity`), Join Queue (`waiting`), Open Requests (`pending + acknowledged`), and Urgent SOS counter (`pulsing red if > 0`)
- [x] Live request queue with reactive subscription (`listRequestsForHost`) displaying musician name, instrument badge, category, message, and relative timestamps
- [x] Status filter tabs: `Open` (default), `SOS` (urgent open), `Pending`, `In Progress` (acknowledged), `Resolved`, and `All`, plus quick search
- [x] One-tap request status transitions:
  - `Acknowledge`: transitions `pending` → `acknowledged`, notifies musician FOH is adjusting, sets `acknowledgedAt`
  - `Resolve`: transitions to `resolved`, sets `resolvedAt`, records duration
  - Direct resolution from pending sets both timestamps cleanly
- [x] Audit trail: all status transitions write audit rows to `requestEvents` with `actorType: "host"`
- [x] Stage roster with real-time online presence dots (green if active within 75s, zinc/slate if inactive) and musician remove action
- [x] Join approval queue with server-side capacity enforcement (`isRoomFull` feedback and disabled approval)
- [x] Visual-only alerts: strictly zero audio playback or notification sounds
- [x] Zero mixer automation: purely visual operator communication
- [x] FOH service history view (`/room/[roomId]/history`) with audit log from `requestEvents`
- [x] Metrics for average acknowledgment and resolution durations (time-to-acknowledge and time-to-resolve)
- [x] Multi-parameter filters (musician, instrument, status, date, text search)
- [x] One-click RFC 4180 CSV export with proper escaping for worship team debriefing
- [x] Verified via `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors, 0 warnings), `npm run build` (0 errors, all 8 routes compiled), and 10/10 security test assertions passed

---

### Phase 6: Reliability, Presence & PWA [COMPLETED]
- [x] Musician heartbeat: 25s interval, immediate beat on mount and visibility return; 75s offline threshold
- [x] Host heartbeat: token-verified host presence (`lastHostSeenAt`); musician warning if FOH unseen for 75s (non-blocking)
- [x] Reusable `useConnectionState` hook combining `navigator.onLine`, Convex WebSocket state, and 5s grace period
- [x] Offline UI & role-specific banners on both screens (`role="musician"`, `role="foh"`); action controls disabled; stale requests never queued
- [x] PWA Web App Manifest (`public/manifest.json`) with `#090D18` theme/background colors and high-res PNG icons (192, 512, maskable)
- [x] iOS enhancements (`apple-touch-icon.png`, `apple-mobile-web-app-capable`, `black-translucent`, safe-area insets)
- [x] Service worker (`public/sw.js`) caching only static assets; strictly never intercepts or caches Convex traffic
- [x] FOH iPad hardening: Screen Wake Lock API, `beforeunload` guard on active sessions, `overscroll-behavior: none`, touch optimizations
- [x] Persistent SOS banner acknowledged state indicator (`Acknowledged (FOH Adjusting)`)
- [x] New request card entrance animation (`animate-request-entrance`) respecting `prefers-reduced-motion`
- [x] Verified via `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors, 0 warnings), `npm run build` (0 errors), and end-to-end reliability tests passed

---

### Phase 7: Production Deployment & Real-Device Testing [READY FOR USER DEPLOYMENT AND DEVICE TESTING]

#### Locally Verified & Hardened for Production:
- [x] **Decoupled presence from server query clock:** `listParticipantsForHost` and `getMusicianSession` return raw timestamps; FOH and Musician screens recalculate online presence reactively via local 3-second client intervals. Verified with simulated tab close: flips to inactive at 75s with 0 mutations.
- [x] **Zero hardcoded deployment URLs:** Removed all default Convex URLs. Environment variable `NEXT_PUBLIC_CONVEX_URL` is required, with startup error boundary if omitted.
- [x] **Security Headers & Crawl Prevention:** Configured `next.config.ts` with strict CSP (allowing Convex WSS/HTTPS), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Robots-Tag: noindex, nofollow` on `/room/`, `/join`, and `/create-room`. Added `public/robots.txt`.
- [x] **Heartbeat Rate-Limiting:** Enforced 5s write suppression in `convex/presence.ts` to prevent client loop spam.
- [x] **Zero Credential Leaks in Logs/Console:** Audited all routes and Convex functions; verified no raw tokens, token hashes, or participant secrets are logged.
- [x] **Git Cleanliness & Config:** Audited `.gitignore`, verified `.env.local` is ignored, and created complete `.env.example`.
- [x] **Automated Security & Reliability Suite:** Passed 100% of tests in `scripts/test-security-audit.js`, `scripts/test-phase6.js`, and `scripts/test-presence-timing.js`.
- [x] **Production Build Cleanliness:** `npx tsc --noEmit` passed (0 errors); `npm run lint` passed (0 errors, 0 warnings); `npm run build` compiled all 8 routes cleanly.

#### Documentation Prepared for User Execution:
- [x] Authored **`DEPLOYMENT.md`**: Complete step-by-step production runbook (Convex production deployment, Vercel edge deployment, custom domain & SSL, 5-minute post-deploy smoke test, rollback instructions, and Sunday morning volunteer checklist).
- [x] Authored **`TESTING.md`**: Physical device verification runbook containing all 12 scenarios from PRD Section 19 with step-by-step actions, expected results, pass/fail checkboxes, and hardware-specific tests (iPad Safari landscape PWA, smartphone single-handed reachability, Wi-Fi disconnect/recovery, 60-minute soak test).
- [x] Updated **`README.md`**: Complete system architecture, security bearer model, local setup, test commands, and production links.

#### Pending User Action (Cannot be run by agent without credentials/devices):
- [ ] **[PENDING USER ACTION]** Deploy Convex backend to production (`npx convex deploy`) and verify tables & crons in Convex Dashboard.
- [ ] **[PENDING USER ACTION]** Connect repository to Vercel, set `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOY_KEY`, and deploy.
- [ ] **[PENDING USER ACTION]** Configure church custom domain with HTTPS DNS records.
- [ ] **[PENDING USER ACTION]** Execute 12 PRD Section 19 physical device test scenarios on FOH iPad and 6–8 smartphones on church Wi-Fi using `TESTING.md`.

---

## Acceptance Criteria Status (PRD Section 18)

| Category | Requirement | Local Verification | Production / Device Test |
|---|---|:---:|:---:|
| **Room Management** | FOH can create a room | [x] Verified locally | [ ] Pending user live deploy |
| | Unique room codes generated | [x] Verified locally | [ ] Pending user live deploy |
| | QR invitation works | [x] Verified locally | [ ] Pending physical iPad scan |
| | Rooms can be ended | [x] Verified locally | [ ] Pending user live deploy |
| | Expired rooms cannot be joined | [x] Verified locally | [ ] Pending user live deploy |
| **Joining** | Musicians join using room code | [x] Verified locally | [ ] Pending multi-phone test |
| | QR joining works | [x] Verified locally | [ ] Pending physical camera scan |
| | Profiles can be created & remembered | [x] Verified locally | [ ] Pending device testing |
| | FOH approval required | [x] Verified locally | [ ] Pending multi-phone test |
| | FOH can reject participants | [x] Verified locally | [ ] Pending multi-phone test |
| | Max 8 approved musicians enforced | [x] Verified locally | [ ] Pending multi-phone test |
| **Communication** | Send all 11 predefined requests | [x] Verified locally | [ ] Pending multi-phone test |
| | Custom messages work (up to 240 chars) | [x] Verified locally | [ ] Pending multi-phone test |
| | SOS 2-step alert works | [x] Verified locally | [ ] Pending multi-phone test |
| | FOH receives requests without refreshing | [x] Verified locally | [ ] Pending multi-phone test |
| | FOH can acknowledge & resolve requests | [x] Verified locally | [ ] Pending multi-phone test |
| | Musicians see status in real time | [x] Verified locally | [ ] Pending multi-phone test |
| **Dashboard** | FOH works in iPad landscape | [x] Verified locally | [ ] Pending physical iPad test |
| | Participant status is displayed | [x] Verified locally | [ ] Pending physical iPad test |
| | SOS requests visually prominent | [x] Verified locally | [ ] Pending physical iPad test |
| | New requests receive visual highlight | [x] Verified locally | [ ] Pending physical iPad test |
| | Offline status is visible | [x] Verified locally | [ ] Pending Wi-Fi disconnect test |
| **Security** | Host & participant tokens protected | [x] Verified locally | [ ] Pending production verification |
| | Musicians cannot access FOH controls | [x] Verified locally | [ ] Pending device verification |
| | History strictly isolated per musician | [x] Verified locally | [ ] Pending device verification |
| | Unapproved participants blocked | [x] Verified locally | [ ] Pending device verification |
| | Ended rooms reject all activity | [x] Verified locally | [ ] Pending device verification |
| **Deployment** | Application builds successfully | [x] 100% Passed (`npm run build`) | [ ] Passed |
| | Application is deployed | [ ] Ready for user run | [ ] Pending user deploy |
| | PWA installation works | [x] Manifest & SW valid | [ ] Pending Safari Add to Home |
| | Real-device testing is completed | [ ] Matrix prepared in `TESTING.md` | [ ] Pending rehearsal testing |
