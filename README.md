# StageSignal 🎛️

**Hear the Stage. Respond from FOH.**

Real-time stage-to-FOH communication platform designed for church worship teams and sound engineers. StageSignal connects musicians on stage directly with the Front of House (FOH) engineer operating digital mixing consoles (Yamaha DM3, Behringer X32, Allen & Heath, etc.).

---

## ⚡ What StageSignal Does

1. **Eliminates hand-waving & eye contact during worship**: Musicians tap preset buttons (*More Click, Less Click, More Me, More Bass, More Drums, Can't Hear*) or send custom messages from their phones in under 2 seconds.
2. **Dedicated iPad Landscape FOH Console**: The sound engineer receives requests reactively without page refreshing, acknowledges them with one tap (*"I'm adjusting your mix now"*), and marks them resolved.
3. **Urgent SOS Alerts**: A prominent red SOS button with a safety confirmation step triggers persistent visual alerts across the FOH dashboard until handled.
4. **Zero Passwords or Accounts**: Ephemeral room-based sessions powered by cryptographically generated tokens (SHA-256 hashes stored in Convex database; raw tokens retained only in local device keychain).
5. **Real-Time Device Presence & Heartbeat**: Real-time online/offline indicator for every musician on stage (evaluated every 25s; offline timeout 75s; client-ticking offline dot).
6. **QR-Based Instant Join**: FOH can display or print a high-resolution QR code that musicians scan to join instantly.
7. **Service Audit & History Log**: Full timestamped log of requests, time-to-acknowledge, and time-to-resolve, with one-click RFC 4180 CSV export for worship team debriefing.
8. **PWA & Offline Resilience**: Installable on iPad and iPhone/Android home screens with safe-area notch padding and clear offline detection banners.

---

## 🚀 Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling & UI:** Tailwind CSS, shadcn/ui design tokens, Lucide React
- **Backend & Database:** Convex (reactive queries, subscriptions, and mutations)
- **Security:** Ephemeral token sessions, SHA-256 server hashing, constant-time verification (`timingSafeEqual`), server-enforced capacity limits
- **QR Engine:** `qrcode` canvas rendering & image download
- **PWA:** Web App Manifest + Service Worker shell cache

---

## 📱 Application Routes

| Route | Description | Primary Device |
|---|---|---|
| `/` | StageSignal Landing, Quick FOH Start, Musician Join | All Devices |
| `/create-room` | Advanced FOH room setup (session type, capacity, custom code) | iPad / Desktop |
| `/join` | Musician room join with remembered profile & instrument picker | Mobile Phone |
| `/room/[roomId]/waiting` | Musician approval queue with live reactive status beacon | Mobile Phone |
| `/room/[roomId]/musician` | Mobile stage dashboard with preset buttons, SOS, and status banner | Mobile Phone |
| `/room/[roomId]/foh` | High-density FOH soundboard dashboard (landscape optimized) | iPad Landscape |
| `/room/[roomId]/history` | Service history log, resolution duration metrics, and CSV export | iPad / Desktop |

---

## 🔒 Security Architecture

- **No Traditional Authentication:** No emails, passwords, or persistent account databases.
- **Bearer Token Model:**
  - **Host Token:** 64-character cryptographically secure token generated on client via `crypto.getRandomValues` and stored in FOH `localStorage`.
  - **Participant Token:** Cryptographic token stored only on the musician's device.
- **Server-Side SHA-256 Hashing:** Raw tokens are never stored in the database. Convex stores only SHA-256 hex hashes.
- **Constant-Time Verification:** Server hashes the incoming raw token and compares it to the database record using constant-time comparison (`timingSafeEqual`) to prevent timing side-channel attacks.
- **Zero Token Leakage:** No query, mutation response, or audit record returns raw tokens or token hashes to the client.
- **Capacity & Approval Enforcement:** Maximum approved musicians (default 8) is strictly enforced server-side. Unapproved participants cannot send requests.
- **Ended Room Lockdown:** Ended or expired rooms automatically reject new joins and requests.

---

## 🛠️ Getting Started Locally

### 1. Prerequisites
- Node.js 18+ or 20+
- npm

### 2. Installation
```bash
npm install
```

### 3. Connect to Convex Backend
Configure your environment variables:
```bash
# Copy example environment
cp .env.example .env.local
```

Initialize your Convex cloud deployment:
```bash
npx convex dev
```
This configures `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Automated Verification & Test Suite
Run local verification scripts:
```bash
# Full security audit (8 assertions: host auth, capacity, history isolation, token scrub)
node scripts/test-security-audit.js

# Reliability, Presence & PWA test suite
node scripts/test-phase6.js

# Real-time 75s presence flip simulation
node scripts/test-presence-timing.js

# Production TypeScript and ESLint checks
npx tsc --noEmit
npm run lint
npm run build
```

---

## 📖 Deployment & Real-Device Testing Guides

- **[DEPLOYMENT.md](DEPLOYMENT.md):** Complete step-by-step production runbook for deploying Convex Cloud backend and Vercel Next.js edge frontend, custom domain setup, 5-minute smoke test, and volunteer instructions.
- **[TESTING.md](TESTING.md):** Detailed testing matrix covering all 12 scenarios from PRD Section 19, hardware tests for iPad Safari and smartphone PWAs, capacity clamps, and 60-minute soak test protocols.
- **[CHECKLIST.md](CHECKLIST.md):** Complete phase-by-phase implementation and acceptance verification checklist.

---

## 🖼️ Image Protection Defaults

Applied across all image assets:
- Modular `image-protection.css` and `<ImageProtection />` client component.
- Prevents casual drag-and-drop and image context menu copying.
- Preserves full accessibility, SEO metadata, and standard text selection.
- *Limitation notice:* As with all web applications, screenshots and browser DevTools can bypass client-side image protection.

---

## 📋 Church Sunday Workflow

1. **FOH Engineer**: Opens StageSignal on iPad in landscape mode, creates "Sunday Morning Worship", and taps "Musician QR".
2. **Musicians**: Scan the QR code or enter code `GRACE-4821` on their smartphones, select their instrument (Lead Vocal, Keys, Drums, etc.), and tap "Request to Join".
3. **FOH Approval**: FOH reviews incoming names in the approval tray and taps "Approve".
4. **Live Service**: Musician taps "More Click" or "More Bass". FOH receives it instantly, acknowledges it, adjusts the console, and taps "Mark Done".
5. **Debrief**: After the service, FOH views `/history` to review monitor issues and exports the CSV report.
