# StageSignal — Production Deployment Runbook

This guide covers deploying StageSignal to **Convex Cloud** (reactive database & backend) and **Vercel** (Next.js App Router frontend & edge hosting).

> **Important Security & Production Notice:**
> - StageSignal uses **temporary token authentication** (64-character cryptographically secure hex tokens).
> - Convex stores **only SHA-256 hashes**. Raw tokens are never stored in the database, returned in queries, or written to logs.
> - Client and server communicate over encrypted HTTPS/WSS.
> - No deployment keys or `.env.local` secrets are committed to the repository.

---

## Prerequisites Checklist

Before you begin, ensure you have:
1. A [GitHub](https://github.com) account with push access to this repository.
2. A [Vercel](https://vercel.com) account (Hobby or Pro).
3. A [Convex](https://convex.dev) account logged in on your terminal.
4. Node.js 18+ and `npm` installed locally.

---

## Step 1: Deploy Convex Backend to Production

Convex separates development and production deployments. To publish your schema, backend functions, and cron jobs to production:

### 1.1 Run the Convex Production Deployment Command
In your local project root (`stagesignal`), execute:

```bash
npx convex deploy
```

If prompted to log in:
```bash
npx convex login
```

### 1.2 Verify Production Deployment in Convex Dashboard
1. Open the [Convex Dashboard](https://dashboard.convex.dev).
2. Select your `stagesignal` project.
3. Switch the deployment dropdown from **Development** to **Production**.
4. Confirm:
   - **Schema:** All 4 tables (`rooms`, `participants`, `requests`, `requestEvents`) are active with their indexes (`by_code`, `by_status`, `by_room`, `by_room_and_status`, `by_participant`).
   - **Schedules / Crons:** The `sweepOverdueRooms` cron is registered and scheduled to run every 10 minutes (`*/10 * * * *`).
   - **Settings -> URL & Deploy Key:**
     - Copy your **Production Deployment URL** (format: `https://<prod-deployment-name>.convex.cloud`).
     - Generate a new **Production Deploy Key** (format: `prod:...`) and save it securely.

---

## Step 2: Deploy Frontend to Vercel

### 2.0 Push Code to GitHub (If not already committed)
If you haven't pushed this repository to GitHub yet:
```bash
git init
git add .
git commit -m "feat: StageSignal production release"
git branch -M main
git remote add origin https://github.com/<your-username>/stagesignal.git
git push -u origin main
```

### 2.1 Import the Repository to Vercel
1. Log in to [Vercel](https://vercel.com) and click **"Add New..."** -> **"Project"**.
2. Select your `stagesignal` GitHub repository.
3. Keep the Framework Preset as **Next.js**.

### 2.2 Configure Environment Variables
In the **Environment Variables** section, add the following variables:

| Variable Name | Environment | Value | Description |
|---|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Production & Preview | `https://<prod-deployment-name>.convex.cloud` | Public URL for the Next.js client to establish WebSocket & HTTP subscriptions |
| `CONVEX_DEPLOY_KEY` | Production & Preview | `prod:...` | Secret production deployment key generated in Step 1.2 |

> ⚠️ **DO NOT** commit `.env.local` to git. Ensure `NEXT_PUBLIC_CONVEX_URL` uses `https://` and targets your production Convex deployment.

### 2.3 Configure Build Command (Automatic Schema Sync)
In Vercel **Project Settings -> General -> Build & Development Settings**:
- **Build Command:** Override and set to:
  ```bash
  npx convex deploy --cmd 'npm run build'
  ```
  *(This ensures that whenever Vercel builds your Next.js application, Convex functions and schema are deployed synchronously, eliminating schema mismatches).*
- **Output Directory:** Leave as default (`.next`).
- **Install Command:** Leave as default (`npm install`).

### 2.4 Deploy
Click **"Deploy"**. Vercel will build the Next.js routes and bundle the PWA assets.

---

## Step 3: Custom Domain & HTTPS Setup

1. In Vercel, go to **Settings -> Domains**.
2. Enter your church's domain or subdomain (e.g., `stagesignal.yourchurch.org` or `stage.yourchurch.org`).
3. Configure your DNS provider with the suggested records:
   - **CNAME Record:** `cname.vercel-dns.com` for subdomains.
   - **A Record:** `76.76.21.21` for apex domains.
4. Vercel automatically issues and renews an SSL/TLS certificate (Let's Encrypt). Wait until the certificate shows **Valid** (green).
5. **HTTPS Requirement:** Web Crypto (`crypto.getRandomValues`), Web App Manifest, Service Workers (`public/sw.js`), and Screen Wake Lock API strictly require HTTPS.

---

## Step 4: 5-Minute Post-Deployment Smoke Test

Immediately after deployment, execute this rapid verification flow using your live production URL:

| Step | Action | Expected Result | Pass / Fail |
|---|---|---|---|
| **1. Service Check** | Navigate to `https://<your-domain>/` | Landing page loads with dark console styling (`#090D18`), live clock ticks, no console errors. | [ ] |
| **2. Room Creation** | Click **"Create Session (FOH)"**, name it `Sunday Live Test`, select `Sunday Service`, click **Create Session** | Redirects to `/room/[roomId]/foh`. A unique room code (e.g. `GRACE-4821`) and QR code modal are generated. | [ ] |
| **3. Token Isolation** | Open an Incognito/Private window and paste the exact `/room/[roomId]/foh` URL | Shows **"Access Denied: Host token missing or invalid"** with a button to return to home. | [ ] |
| **4. Musician Join** | In the incognito window (or a phone), visit `https://<your-domain>/join`, enter code and choose `Lead Vocal` | Redirects to `/room/[roomId]/waiting` showing "Waiting for FOH Approval". | [ ] |
| **5. Live Approval** | On the FOH window, observe the **Pending Approvals** tray | The musician appears instantly with name and instrument. Click **Approve**. | [ ] |
| **6. Real-time Enter** | Watch the waiting window | Automatically transitions to `/room/[roomId]/musician` without refreshing. | [ ] |
| **7. Preset Request** | Musician taps **"More Vocal in IEM"** | Request appears instantly in FOH Live Queue with blue highlight and pending badge. | [ ] |
| **8. Acknowledge & Resolve** | FOH clicks **Acknowledge**, then **Resolve** | Musician status updates in real-time ("FOH Adjusting" -> "Resolved"). Request transitions cleanly. | [ ] |
| **9. SOS Alarm** | Musician taps **SOS (Mic Dead)** and confirms | Persistent high-contrast RED banner appears across top of FOH console. | [ ] |
| **10. End Session** | FOH clicks **End Room** and confirms | Musician screen locks with "Service Ended". Room code can no longer be used to join. | [ ] |

---

## Step 5: Rollback & Monitoring Instructions

### 5.1 Vercel Frontend Rollback
If a regression occurs in production:
1. Go to **Vercel Dashboard -> Project -> Deployments**.
2. Find the previous stable deployment.
3. Click the three dots `...` and select **"Instant Rollback"**.
4. Traffic is immediately redirected to the prior build with zero downtime.

### 5.2 Convex Database & Function Rollback
Convex maintains an immutable history of function deployments:
1. In [Convex Dashboard](https://dashboard.convex.dev), go to **Functions**.
2. Review recent function executions and error traces.
3. Under **Logs**, filter by errors or mutations (`createRequest`, `requestJoin`).
4. To restore previous code, run `git revert <commit>` locally and deploy with `npx convex deploy`.

### 5.3 Audit & History Log Export
To preserve full records of worship sessions:
1. Navigate to `/room/[roomId]/history` on the host device.
2. Use the filters (musician, instrument, date, status).
3. Click **"Export CSV"** to download an RFC 4180 compliant CSV containing all submitted, acknowledged, and resolved timestamps, response latencies, and message contents.

---

## Step 6: Sunday Morning FOH Volunteer Checklist

Print or keep this 15-minute checklist at the FOH mixing console every Sunday morning:

- [ ] **T-30 min — iPad Setup:**
  - Connect FOH iPad to charger and church Wi-Fi.
  - Open Safari and navigate to your production URL.
  - Verify fullscreen PWA mode or Safari landscape orientation.
- [ ] **T-25 min — Create Room:**
  - Click **"Create Session"**.
  - Enter name: `Sunday Service [Date]` (e.g., `Sunday Morning 10:30 AM`).
  - Select session type: **Sunday Service**.
- [ ] **T-20 min — Stage Invitation:**
  - Click **"Invite Musicians (QR)"** in the top navigation bar.
  - Leave the QR code open on the screen or print/place the generated code sheet on the stage music stands.
- [ ] **T-15 min — Soundcheck & Approval:**
  - As musicians arrive and scan the QR code, approve each musician from the **Pending Approvals** banner.
  - Confirm the Stage Roster shows all expected musicians with a pulsing green connection indicator.
- [ ] **T-10 min — Test Signal:**
  - Ask the acoustic guitarist or lead vocalist to send a test cue (e.g., "Check Monitor").
  - Acknowledge and resolve the request from the FOH queue.
- [ ] **Post-Service — Close Session:**
  - After the final dismissal and postlude, click **"End Session"** in the top right room settings.
  - Confirm the dialog to lock the room and prevent lingering requests.
