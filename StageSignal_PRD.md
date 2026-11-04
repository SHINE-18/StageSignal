<USER_REQUEST>
# StageSignal
## Product Requirements Document (PRD)
**Version:** 1.0  
**Product Type:** Real-time Web Application / Progressive Web App (PWA)  
**Primary Platform:** Mobile phones and iPad  
**Development Environment:** Google Antigravity  
**Frontend:** Next.js, React, TypeScript  
**Styling:** Tailwind CSS, shadcn/ui  
**Backend:** Convex  
**Database:** Convex Database  
**Hosting:** Vercel + Convex Cloud  

---

# 1. Product Overview

## 1.1 Product Name

**StageSignal**

Tagline: *Hear the Stage. Respond from FOH.*

## 1.2 Product Vision

StageSignal is a lightweight, real-time communication platform designed to connect musicians on a church worship stage with the Front of House (FOH) sound engineer.

The application solves a common problem in live church sound engineering: musicians often need adjustments to their monitor mixes but cannot easily communicate with the FOH engineer.

The FOH engineer may be occupied operating a digital mixing console, monitoring the room, or adjusting sound on an iPad. Musicians may struggle to get the engineer's attention through eye contact or hand signals.

StageSignal provides a simple alternative.

Musicians can use their smartphones to send predefined sound requests or custom messages. The FOH engineer receives these requests instantly on an iPad dashboard and can acknowledge and resolve them.

The application must be extremely simple for musicians and operationally powerful for the FOH engineer.

## 1.3 Core Concept

StageSignal uses a temporary room-based system.

- FOH creates a room.
- The application generates a unique room code and QR code.
- Musicians join using the room code or QR code.
- Musicians create a quick profile.
- FOH approves each participant.
- Approved musicians can send requests.
- FOH receives requests in real time.
- FOH acknowledges and resolves requests.
- Room history is retained after the service ends.

**IMPORTANT: Do not implement traditional authentication.**

There should be no email registration, password login, or permanent user account requirement.

Use temporary, securely managed host and participant session tokens instead.

---

# 2. Product Goals

## 2.1 Primary Goals

1. Make communication between musicians and FOH easier.
2. Eliminate the need for musicians to repeatedly signal the sound engineer.
3. Deliver requests in real time.
4. Allow the FOH engineer to identify exactly who needs assistance.
5. Provide acknowledgement so musicians know their requests have been seen.
6. Maintain a record of requests for each service.
7. Provide a responsive experience on smartphones and iPads.

## 2.2 Secondary Goals

- Allow musicians to reuse their profiles during future services.
- Provide a QR-based joining experience.
- Allow FOH to approve or reject participants.
- Display connected and disconnected participants.
- Support rehearsal, Sunday worship, and special service sessions.
- Keep the application lightweight and easy to operate.

## 2.3 Non-Goals for MVP

Do not implement these features in the first release:

- Direct Yamaha DM3 control.
- Automatic monitor mixing.
- Audio communication or voice chat.
- Video communication.
- Music streaming.
- Traditional user authentication.
- Payment systems.
- Complex church management functionality.
- Native Android or iOS applications.

StageSignal is a communication tool, not a replacement for an in-ear monitor system.

---

# 3. Target Users and Roles

There are three user roles.

## 3.1 FOH Engineer (Host)

Primary device: iPad.

Responsibilities:

- Create rooms.
- Generate room codes and QR invitations.
- Approve or reject musicians.
- View all connected musicians.
- Receive requests.
- Acknowledge requests.
- Resolve requests.
- View request history.
- Remove participants.
- End active rooms.

The host must have exclusive access to room management and FOH controls.

## 3.2 Musician (Participant)

Primary device: Android or iPhone.

Responsibilities:

- Join a room.
- Create or reuse a profile.
- Select an instrument.
- Wait for FOH approval.
- Send predefined requests.
- Send custom messages.
- View acknowledgement status.
- View personal request history.

Musicians must not be able to access FOH controls.

## 3.3 Administrator

The initial MVP does not require a separate administrator dashboard.

Room management is handled by the FOH host.

---

# 4. Core User Journey

## 4.1 FOH Room Creation

1. FOH opens StageSignal.
2. Selects "Create Room".
3. Enters a room name, such as "Sunday Worship".
4. Selects a session type:
   - Sunday Service
   - Rehearsal
   - Special Event
5. Taps "Create Room".
6. System generates:
   - Unique room ID.
   - Random room code.
   - QR invitation.
   - Private host session token.
7. FOH is redirected to the live dashboard.
8. Room becomes active.

The room code must be easy to share but difficult to guess.

Example: `GRACE-4821`

Use cryptographically secure random code generation.

The system should prevent active room-code collisions.

## 4.2 Musician Joining

1. Musician connects to church Wi-Fi.
2. Scans the QR code or opens StageSignal manually.
3. Enters the room code if not already included in the QR link.
4. System validates that the room exists and is active.
5. Musician sees the room name.
6. Musician creates or reuses a profile.

Profile fields:

- Display name.
- Instrument.

Supported instruments:

- Lead Vocal
- Backing Vocal
- Bass Guitar
- Drums
- Keyboard
- Electric Guitar
- Acoustic Guitar
- Other

7. Musician taps "Request to Join".
8. Participant appears in the FOH approval queue.
9. FOH approves or rejects the request.
10. If approved, musician enters the dashboard.
11. If rejected, display a clear message.

## 4.3 Profile Persistence

Remember the musician's profile on their device.

Persist:

- Name.
- Instrument.
- Device-specific participant identity token.

Use localStorage for profile preferences and secure random tokens.

The participant token must not be stored as plain text in the Convex database. Store its SHA-256 hash.

On future visits:

1. Musician opens StageSignal.
2. Enters the new room code.
3. Previous profile is automatically populated.
4. Musician confirms or edits the details.
5. Requests access to the new room.
6. FOH approves them again.

A previous room's approval must never carry over into another room.

Provide an option to edit or clear the remembered profile.

---

# 5. Functional Requirements

## 5.1 Room Management

The system must support:

- Creating rooms.
- Generating unique room codes.
- Generating QR invitations.
- Active and ended room states.
- Automatic room expiry.
- Room capacity management.
- Participant approval.
- Participant removal.
- Room termination.

### Room Configuration

Default configuration:

| Setting | Default |
|---|---|
| Maximum approved musicians | 8 |
| Room duration | 12 hours |
| Joining method | QR or code |
| Approval | Required |
| Room status | Active |
| Session type | Sunday Service |

The capacity should be configurable for future use.

### Room States

- Active
- Ended
- Expired

When a room ends, no new requests or joins should be accepted.

Existing history must remain available.

## 5.2 Musician Dashboard

The musician dashboard is the most frequently used interface.

It must be mobile-first.

### Design Requirements

- Large touch-friendly buttons.
- Minimal navigation.
- High contrast.
- Dark theme.
- No unnecessary animations.
- No complicated menus.
- Fast request submission.
- Clear connection status.

### Predefined Request Buttons

Create the following buttons:

| Button | Message |
|---|---|
| More Click | Please increase click in my monitor. |
| Less Click | Please decrease click in my monitor. |
| More Me | Please increase my instrument/vocal in my monitor. |
| Less Me | Please decrease my instrument/vocal in my monitor. |
| More Bass | Please increase bass in my monitor. |
| Less Bass | Please decrease bass in my monitor. |
| More Drums | Please increase drums in my monitor. |
| More Keys | Please increase keyboard in my monitor. |
| More Vocal | Please increase vocals in my monitor. |
| Can't Hear | Something is missing from my monitor. |
| SOS | I need urgent help from FOH. |

All buttons must send requests with one tap.

### Custom Message

Provide a custom request field.

Requirements:

- Maximum 240 characters.
- Send button.
- Character counter.
- Validation for empty messages.
- Display submission confirmation.
- Prevent accidental duplicate submissions while a request is being submitted.

### SOS

SOS must be visually prominent.

When tapped:

1. Display a short confirmation.
2. On confirmation, send an urgent request.
3. Display the request prominently on the FOH dashboard.
4. Mark the request with urgent priority.

SOS should never automatically change mixer settings.

### Request Status on Musician Screen

Musicians must see the status of their requests:

- Pending
- Acknowledged
- Resolved

Display a clear message when FOH acknowledges their request.

The status must update without refreshing the page.

---

# 6. FOH Dashboard

## 6.1 Primary Device

The FOH dashboard must be specifically optimized for an iPad in landscape orientation.

Desktop support is also required.

Do not simply stretch a mobile layout onto a tablet.

## 6.2 Dashboard Layout

The dashboard should contain:

### Header

- StageSignal logo.
- Room name.
- Room code.
- Active room indicator.
- Connection status.
- Room management controls.

### Statistics

Display:

- Connected musicians.
- Pending join requests.
- Open requests.
- Urgent requests.

### Join Approval Section

Display incoming participants with:

- Name.
- Instrument.
- Join time.
- Approve button.
- Reject button.

New join requests must appear automatically.

### Live Request Queue

Every request must display:

- Musician name.
- Instrument.
- Request message.
- Request category.
- Priority.
- Submission time.
- Current status.

### Request Actions

FOH must be able to:

1. Acknowledge.
2. Mark as resolved.

Status workflow:

PENDING → ACKNOWLEDGED → RESOLVED

Do not allow musicians to resolve their own requests.

### Request Priority

Use three visual treatments:

- Normal: Neutral/blue.
- Acknowledged: Blue.
- SOS: Red.

Urgent requests must appear more prominently than regular requests.

### Visual Alerts

The user has selected visual-only alerts.

Implement:

- New request card animation.
- Brief card highlight.
- Pending request counter.
- Persistent SOS banner until acknowledged.
- Clear connection-loss warning.

Do not play notification sounds by default.

The dashboard should remain useful without requiring browser push notifications.

---

# 7. Request History

Both FOH and musicians need request history.

## 7.1 FOH History

Display all requests from the current and previous sessions.

Fields:

- Musician.
- Instrument.
- Request.
- Priority.
- Submitted time.
- Acknowledged time.
- Resolved time.
- Final status.

Filters:

- By service.
- By musician.
- By instrument.
- By status.
- By date.

## 7.2 Musician History

Musicians should only see their own request history.

Display:

- Request message.
- Submitted time.
- Acknowledgement status.
- Resolution status.

Do not expose other musicians' private session tokens or personal information.

---

# 8. Connection and Presence System

This is an important feature because FOH needs to know whether musicians are actually connected.

Implement a lightweight presence system.

### Requirements

- Display connected musicians.
- Display disconnected musicians.
- Update presence automatically.
- Handle temporary internet interruptions.
- Restore participant state when a device reconnects.

### Suggested Implementation

Use Convex mutations for heartbeats.

Example:

- Send heartbeat every 20–30 seconds.
- Mark participant offline after approximately 60–90 seconds without a heartbeat.
- Recalculate connection status on the FOH dashboard.

Do not treat a saved profile or valid token as proof that a device is currently online.

Use an appropriate timeout to avoid marking someone disconnected during a brief network interruption.

---

# 9. Technical Architecture

## 9.1 Technology Stack

Use the following technologies:

| Layer | Technology |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| UI | React |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Icons | Lucide React |
| Backend | Convex |
| Database | Convex Database |
| Real-time Updates | Convex Queries and Subscriptions |
| Authentication | Temporary token-based sessions |
| PWA | Web App Manifest + Service Worker |
| QR Code | QR code generation library |
| Hosting | Vercel |
| Backend Hosting | Convex Cloud |

Use current stable compatible package versions when setting up the project.

## 9.2 Architecture

The application follows this architecture:

Musician Phones / FOH iPad

↓

Next.js Frontend

↓

Convex Backend

↓

Convex Database

The frontend must use Convex subscriptions for real-time updates.

Do not implement manual polling for requests when Convex subscriptions can provide the data reactively.

## 9.3 Authentication and Authorization

There is no traditional authentication.

Implement temporary identity using cryptographically secure random tokens.

There are two token types:

**Host Token**
- Generated when FOH creates a room.
- Stored locally on the host device.
- Has permission to manage the room.
- Never exposed to musicians.

**Participant Token**
- Generated when a musician requests to join.
- Stored locally on the musician's device.
- Grants access only to that participant's approved room session.
- Cannot access host functions.

Store only token hashes in Convex.

Use SHA-256 hashing.

Validate the token and permissions on every protected query and mutation.

Do not trust client-side role information.

Never expose secret tokens in room data, public queries, URLs, or logs.

---

# 10. Database Schema

Use Convex schema validation.

## 10.1 Rooms

Table: `rooms`

Fields:

- name: string
- code: string
- status: active | ended
- sessionType: sunday | rehearsal | special
- hostTokenHash: string
- createdAt: number
- expiresAt: number
- endedAt: optional number

Indexes:

- by_code
- by_status

## 10.2 Participants

Table: `participants`

Fields:

- roomId: Id<rooms>
- name: string
- instrument: string
- participantTokenHash: string
- status: pending | approved | rejected | removed
- joinedAt: number
- lastSeenAt: number

Indexes:

- by_room
- by_room_and_status

## 10.3 Requests

Table: `requests`

Fields:

- roomId: Id<rooms>
- participantId: Id<participants>
- category: string
- message: string
- priority: normal | urgent
- status: pending | acknowledged | resolved
- createdAt: number
- acknowledgedAt: optional number
- resolvedAt: optional number

Indexes:

- by_room
- by_participant
- by_room_and_status

## 10.4 Request Events

Table: `requestEvents`

Fields:

- requestId: Id<requests>
- action: created | acknowledged | resolved
- actorType: musician | host
- timestamp: number

Use this for audit history.

## 10.5 Security Requirements

- Never store raw tokens in database records.
- Validate room ownership before host operations.
- Validate participant ownership before musician operations.
- Verify that a participant is approved before accepting a request.
- Prevent participants from accessing other participants' histories.
- Reject requests for ended or expired rooms.
- Prevent unauthorized participant approval.
- Enforce the room capacity on the server, not just in the frontend.
- Add rate limiting or abuse controls for public room joining and request submission.

---

# 11. Convex Backend Functions

Organize functions into logical modules.

### rooms.ts

- createRoom
- getRoomByCode
- getHostRoom
- endRoom
- expireRoom

### participants.ts

- requestJoin
- listParticipantsForHost
- approveParticipant
- rejectParticipant
- removeParticipant
- getParticipantStatus
- updatePresence

### requests.ts

- createRequest
- listRequestsForHost
- updateRequestStatus
- listMyRequests

### presence.ts

- heartbeat
- getRoomPresence

All backend functions must validate permissions.

Do not put business logic exclusively in React components.

---

# 12. UI/UX Design System

## 12.1 Overall Visual Direction

Create a modern, professional, dark-mode interface inspired by professional live audio software and contemporary SaaS dashboards.

Avoid:
- Generic admin dashboard appearance.
- Excessive gradients.
- Excessive glassmorphism.
- Unnecessary decorative elements.
- Tiny controls.
- Complicated navigation.

## 12.2 Color Palette

Suggested colors:

- Main background: #090D18
- Secondary background: #111827
- Card background: #151D2D
- Primary blue: #3B82F6
- Success green: #22C55E
- Warning amber: #F59E0B
- Urgent red: #EF4444
- Primary text: #F8FAFC
- Secondary text: #94A3B8

## 12.3 Typography

Use Inter.

## 12.4 Musician UI

- Mobile-first.
- Single-column or two-column request grid depending on screen width.
- Buttons at least 56px high.
- Easy one-handed operation.
- Minimal scrolling.
- Clearly visible connection status.

## 12.5 FOH UI

- Landscape-first tablet design.
- Multiple information sections.
- Prominent request queue.
- Visible SOS section.
- Participant sidebar.
- Large acknowledgement and resolve controls.

## 12.6 Responsive Behaviour

Support:

- Mobile phones: 360px and above.
- Tablets: 768px and above.
- iPad landscape: approximately 1024px and above.
- Desktop: 1280px and above.

---

# 13. Application Routes

Use Next.js App Router.

Suggested structure:

```text
app/
├── page.tsx
├── create-room/
│   └── page.tsx
├── join/
│   └── page.tsx
├── room/
│   └── [roomId]/
│       ├── foh/
│       │   └── page.tsx
│       ├── waiting/
│       │   └── page.tsx
│       ├── musician/
│       │   └── page.tsx
│       └── history/
│           └── page.tsx
├── components/
├── providers/
└── globals.css

convex/
├── schema.ts
├── rooms.ts
├── participants.ts
├── requests.ts
├── presence.ts
├── security.ts
└── _generated/

public/
├── manifest.json
└── icons/
```

Separate reusable components from page components.

Do not put the entire application into one large React component.

---

# 14. PWA Requirements

StageSignal should be installable on iPad and smartphones.

Implement:

- Web app manifest.
- Application icons.
- Standalone display mode.
- Appropriate theme colors.
- Responsive layouts.
- Safe-area support.
- Appropriate viewport configuration.
- Service worker for application shell caching.

The service worker must not imply that requests can be sent offline.

If internet or Convex connectivity is lost:

- Clearly display offline status.
- Disable request submission.
- Preserve the current screen where possible.
- Restore live subscriptions after reconnection.

Do not silently queue and submit stale requests after reconnecting.

## iPad Requirements

- Work properly in Safari.
- Support Home Screen installation.
- Keep dashboard visible during services.
- Avoid accidental page navigation.
- Display connection errors clearly.

---

# 15. Network Requirements

The application uses Convex Cloud.

Church Wi-Fi must provide internet connectivity to both the stage and FOH devices.

A local-only Wi-Fi connection without internet is not sufficient for this cloud-based MVP.

Requirements:

- HTTPS.
- Stable internet access.
- Real-time Convex connectivity.
- Reconnection handling.
- Visible network state.

Do not build a local network server in the MVP.

---

# 16. Error Handling

Handle the following cases:

| Scenario | Expected Behaviour |
|---|---|
| Invalid room code | Display room not found |
| Expired room | Display room expired |
| Room ended | Prevent joining and requests |
| Room full | Display capacity reached |
| Join rejected | Display clear rejection message |
| Duplicate submission | Prevent accidental duplicate |
| Internet disconnected | Show offline warning |
| Host disconnected | Show host connection warning where detectable |
| Invalid participant token | Request rejoining |
| Invalid host token | Deny access to FOH dashboard |
| Convex unavailable | Show service connection error |

Errors should be understandable to non-technical users.

---

# 17. Development Phases

Build the application incrementally.

Do not attempt to build the entire system in one generation step.

## Phase 1 — Project Foundation

- Initialize Next.js with TypeScript.
- Configure Tailwind CSS.
- Configure shadcn/ui.
- Install Lucide icons.
- Configure Convex.
- Create the database schema.
- Set up application providers.
- Create the design system.
- Build responsive application shell.

Deliverable: Working project foundation.

## Phase 2 — Room Management

- Create room page.
- Generate unique room code.
- Generate QR invitation.
- Host session token.
- Room status management.
- Room expiry.
- Room capacity.

Deliverable: FOH can create and manage a room.

## Phase 3 — Musician Joining

- Join by code.
- Join through QR.
- Profile creation.
- Profile persistence.
- Join approval.
- Reject participant.
- Waiting screen.
- Participant session tokens.

Deliverable: Musicians can securely request access and enter approved rooms.

## Phase 4 — Musician Communication

- Musician dashboard.
- Predefined requests.
- Custom messages.
- SOS.
- Request history.
- Request status updates.

Deliverable: Musicians can communicate with FOH.

## Phase 5 — FOH Dashboard

- Live participant list.
- Join approval queue.
- Live request queue.
- Visual request alerts.
- Acknowledge.
- Resolve.
- Request history.
- Room controls.

Deliverable: Fully working FOH dashboard.

## Phase 6 — Reliability and PWA

- Heartbeat system.
- Online/offline status.
- Reconnection handling.
- PWA installation.
- iPad optimization.
- Mobile optimization.
- Network interruption testing.

Deliverable: Installable and tested application.

## Phase 7 — Production Deployment

- Production Convex deployment.
- Vercel deployment.
- Environment configuration.
- HTTPS.
- Domain configuration.
- Security testing.
- Real church Wi-Fi testing.

Deliverable: Production-ready StageSignal.

---

# 18. Acceptance Criteria

The MVP is considered complete only when all of the following work:

### Room Management

- [ ] FOH can create a room.
- [ ] Unique room codes are generated.
- [ ] QR invitation works.
- [ ] Rooms can be ended.
- [ ] Expired rooms cannot be joined.

### Joining

- [ ] Musicians can join using a room code.
- [ ] QR joining works.
- [ ] Profiles can be created.
- [ ] Profiles are remembered on the same device.
- [ ] FOH approval is required.
- [ ] FOH can reject participants.
- [ ] Maximum of eight approved musicians is enforced.

### Communication

- [ ] Musicians can send all predefined requests.
- [ ] Custom messages work.
- [ ] SOS works.
- [ ] FOH receives requests without refreshing.
- [ ] FOH can acknowledge requests.
- [ ] FOH can resolve requests.
- [ ] Musicians see acknowledgement updates in real time.

### Dashboard

- [ ] FOH dashboard works in iPad landscape.
- [ ] Participant status is displayed.
- [ ] SOS requests are visually prominent.
- [ ] New requests receive a visual highlight.
- [ ] Offline status is visible.

### Security

- [ ] Host tokens are protected.
- [ ] Participant tokens are protected.
- [ ] Musicians cannot access FOH controls.
- [ ] Musicians cannot access another musician's private history.
- [ ] Unapproved participants cannot submit requests.
- [ ] Ended rooms reject new activity.

### Deployment

- [ ] Application builds successfully.
- [ ] Application is deployed.
- [ ] PWA installation works.
- [ ] Real-device testing is completed.

---

# 19. Testing Strategy

Before production, test with:

- One FOH iPad.
- At least six different smartphones.
- One active Convex deployment.
- Church Wi-Fi.

Test scenarios:

1. Create a room and join from multiple phones.
2. Submit multiple requests simultaneously.
3. Approve participants while requests are being submitted.
4. Send an SOS request.
5. Acknowledge and resolve requests.
6. Disconnect one phone from Wi-Fi.
7. Reconnect the phone.
8. Refresh the FOH dashboard.
9. Close and reopen Safari.
10. Attempt to access FOH routes from a musician device.
11. Attempt to use an invalid or expired token.
12. End the room while participants are connected.

No production deployment should be considered complete until these tests pass.

---

# 20. Future Features

Keep these outside the initial MVP.

- Multiple FOH operators.
- Multiple simultaneous rooms.
- Monitor mix identification.
- Configurable request categories.
- Custom instrument-specific buttons.
- Request analytics.
- Service-to-service comparisons.
- Local-network mode.
- Controlled Yamaha DM3 integration.
- Optional browser push notifications.
- Stage display mode.

---

# 21. Instructions for Google Antigravity

This section is important. Follow these instructions throughout development.

## Development Rules

1. Build a complete, functional application, not a static mockup.
2. Use the specified Next.js, TypeScript, Tailwind CSS, and Convex stack.
3. Use Convex as the source of truth for room state, participant state, and requests.
4. Use Convex reactive queries for live updates.
5. Implement all authorization checks on the backend.
6. Never expose private host or participant tokens.
7. Do not introduce traditional email/password authentication.
8. Use reusable React components.
9. Maintain consistent naming conventions.
10. Follow the specified dark design system.
11. Optimize the musician experience for mobile.
12. Optimize the FOH dashboard for iPad landscape.
13. Add proper loading, empty, success, and error states.
14. Do not use fake data in production functionality.
15. Do not leave buttons without working actions.
16. Do not silently ignore errors.
17. Do not skip security checks to make the UI work.
18. Do not replace Convex with localStorage for application data. localStorage is only for device-specific session credentials and remembered profile preferences.
19. Do not automatically change any audio mixer settings.
20. Test each development phase before proceeding to the next.

## Working Method

Before implementing:

1. Inspect the existing project.
2. Understand the current folder structure.
3. Identify existing dependencies.
4. Preserve working code.
5. Prepare an implementation checklist.

Then implement the application phase by phase.

After each phase:

- Run TypeScript checks.
- Run linting.
- Run a production build when appropriate.
- Fix errors.
- Test the completed functionality.
- Update the project checklist.

Do not claim a feature is complete unless it actually works.

## Final Deliverable

Deliver a complete StageSignal application with:

- Functional room creation.
- QR and room-code joining.
- FOH participant approval.
- Remembered musician profiles.
- Musician request dashboard.
- Real-time FOH dashboard.
- Acknowledgement and resolution.
- Request history.
- Presence monitoring.
- Secure temporary sessions.
- PWA support.
- Responsive iPad and mobile layouts.
- Deployment instructions.

**Final Product Principle:**

StageSignal should feel like a simple communication tool for musicians and a professional live operations dashboard for FOH.

A musician should be able to send a request in under two seconds. The FOH engineer should be able to identify, acknowledge, and resolve that request without interrupting the mixing workflow.

Build for reliability, speed, clarity, and simplicity first.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-03T20:41:19+05:30.
</ADDITIONAL_METADATA>
<USER_SETTINGS_CHANGE>
The user changed setting `Model Selection` from None to Gemini 3.8 Flash (High). No need to comment on this change if the user doesn't ask about it. If reporting what model you are, please use a human readable name instead of the exact string.
</USER_SETTINGS_CHANGE>