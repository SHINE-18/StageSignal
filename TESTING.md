# StageSignal — Real-Device Testing & Verification Guide

This runbook contains the physical test protocols specified in **PRD Section 19** and hardware-specific tests for worship team deployments.

> **Testing Environment:**
> - **FOH Console:** 1× iPad (10.2" or larger) running Safari / PWA Standalone in Landscape mode.
> - **Musicians:** 6–8× distinct smartphones (iOS Safari and Android Chrome) connected to church Wi-Fi.
> - **Backend:** Active Convex deployment.

---

## Part 1: PRD Section 19 — The 12 Mandatory Scenarios

Use this test matrix during your pre-service rehearsal. Check each box and record the observed result.

| # | Scenario | Step-by-Step Procedure | Expected Result | Status | Notes / Tester |
|---|---|---|---|:---:|---|
| **01** | **Create Room & Multi-Phone Join** | 1. FOH creates room on iPad.<br>2. 6 phones scan QR code or enter code at `/join`.<br>3. Each musician enters name + instrument and submits. | All 6 musicians appear in FOH "Pending Approvals" tray within 1s. None can enter before approval. | [ ] PASS<br>[ ] FAIL | |
| **02** | **Simultaneous Requests Burst** | 1. 6 approved musicians tap preset buttons at the exact same second during rehearsal. | FOH queue receives all 6 requests in real-time without drops, page freezes, or duplicate key errors. | [ ] PASS<br>[ ] FAIL | |
| **03** | **Approve During Active Requests** | 1. Musicians 1–4 are approved and sending cues.<br>2. Musician 5 joins `/join`.<br>3. FOH clicks "Approve" while requests arrive. | Queue updates smoothly; Musician 5 transitions from `/waiting` to `/musician` with zero disruption to active requests. | [ ] PASS<br>[ ] FAIL | |
| **04** | **Urgent SOS Alarm** | 1. Lead Vocal taps "SOS (Mic Dead)".<br>2. Tap "Confirm Urgent SOS" on confirmation dialog. | Persistent high-contrast RED banner spans top of FOH console immediately. Badge shows "URGENT SOS". | [ ] PASS<br>[ ] FAIL | |
| **05** | **Acknowledge & Resolve Workflow** | 1. FOH clicks "Acknowledge" on acoustic guitar cue.<br>2. FOH clicks "Resolve". | Musician screen transitions: `Pending` -> `Acknowledged (Blue badge: FOH Adjusting)` -> `Resolved (Green badge)`. | [ ] PASS<br>[ ] FAIL | |
| **06** | **Wi-Fi Disconnect on Phone** | 1. Musician turns on Airplane Mode.<br>2. Wait 5s grace period.<br>3. Observe UI. | Yellow "Reconnecting..." appears immediately, turning to Amber "Device Offline" banner. Cues disabled to prevent stale submissions. | [ ] PASS<br>[ ] FAIL | |
| **07** | **Wi-Fi Reconnection & State Recovery** | 1. Turn Airplane Mode OFF on the disconnected phone.<br>2. Wait 3–5 seconds. | Amber offline banner dismisses automatically. Request history and approved session restore instantly without re-joining. | [ ] PASS<br>[ ] FAIL | |
| **08** | **FOH Dashboard Hard Refresh** | 1. FOH hits Command+R / Refresh on iPad Safari while 6 musicians and 4 requests are active. | Dashboard reloads within 2s, automatically authenticates via stored host token, and restores all live participants and queue items. | [ ] PASS<br>[ ] FAIL | |
| **09** | **Close & Reopen Safari (Backgrounding)** | 1. Musician closes Safari tab or locks phone for 2 minutes.<br>2. Re-open Safari and return to StageSignal URL. | Token session in localStorage restores `/musician` stage console instantly without needing to scan QR or enter code again. | [ ] PASS<br>[ ] FAIL | |
| **10** | **Route Security: Musician Visits FOH** | 1. On a musician's phone, type `/room/<roomId>/foh` into the browser address bar. | Server-side host token validation rejects access. Screen displays "Access Denied: Host token missing or invalid". | [ ] PASS<br>[ ] FAIL | |
| **11** | **Expired / Tampered Token** | 1. Open DevTools or clear localStorage on musician device.<br>2. Attempt to call a protected mutation with an invalid token. | Server returns `UNAUTHORIZED` or `NOT_APPROVED`. Device is safely redirected to `/join`. | [ ] PASS<br>[ ] FAIL | |
| **12** | **End Room During Active Service** | 1. FOH clicks "End Room" and confirms.<br>2. Observe all connected musician screens. | All musician phones immediately display "Service Ended" screen. All action buttons are locked; no new requests can be sent. | [ ] PASS<br>[ ] FAIL | |

---

## Part 2: Hardware & Environment Verification

### 1. FOH iPad (Safari Landscape & PWA)
- [ ] **Home Screen Installation:** Tap Safari Share icon -> "Add to Home Screen". Icon renders cleanly (`icon-192.png` / `apple-touch-icon.png`).
- [ ] **Standalone Mode:** Launches in fullscreen without Safari browser chrome/URL bar.
- [ ] **Screen Wake Lock:** Keep the console open for 30 minutes untouched. Display stays awake (does not lock or sleep).
- [ ] **No Accidental Navigation:** Swiping horizontally does not trigger browser "back/forward" history navigation (`overscroll-behavior: none`).
- [ ] **Console Audio Safety:** FOH interaction produces **zero notification audio** by default (visual-only flashes and banners).

### 2. Musician Mobile Phones (iOS Safari & Android Chrome)
- [ ] **Touch Target Sizing:** All 11 preset cue buttons are at least 56px high for effortless thumb tapping.
- [ ] **One-Handed Operation:** Primary buttons (Vocal, Guitar, Volume, SOS) are reachable with one thumb while holding an instrument.
- [ ] **Notch & Safe Areas:** Content respects notch and home indicator (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`).
- [ ] **Stage Visibility:** Dark high-contrast styling (`#090D18` background, `#F8FAFC` text) does not blind the musician in a dim sanctuary.

### 3. Server Capacity & Presence Limits
- [ ] **Capacity Clamp:** When room capacity is 8, attempting to approve a 9th musician displays "Room capacity reached (8 approved musicians maximum)".
- [ ] **75-Second Presence Dot:** When a musician closes their browser tab, the FOH Stage Roster indicator transitions from **pulsing green (Online)** to **slate gray (Inactive)** after ~75 seconds of silence without requiring any manual refresh.
- [ ] **FOH Disconnect Warning:** If FOH closes their console, musician screens display "FOH may be disconnected — check mixing booth" after ~75 seconds.

### 4. 60-Minute Service Soak Test
- [ ] Run a continuous 60-minute rehearsal session with 1 iPad and 6 phones active.
- [ ] Verify zero memory leaks or tab crashes.
- [ ] Verify WebSocket subscription remains active through ambient pauses without manual polling.

---

## Test Execution Sign-Off

- **Lead FOH Engineer:** ___________________________
- **Worship Leader:** ___________________________
- **Date Tested:** ___________________________
- **Church / Venue:** ___________________________
- **Verdict:** [ ] APPROVED FOR LIVE SERVICE / [ ] REVISIONS REQUIRED
