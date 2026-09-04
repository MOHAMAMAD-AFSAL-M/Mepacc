# MEPac — MEP Contracting Management Platform

> A proprietary admin dashboard for MEP (Mechanical, Electrical & Plumbing) contracting companies to manage projects, workforce, attendance, drawings, and RFIs — all in one place.

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Team](#team)
- [License](#license)

---

## About

**MEPac** is a web-based operations management platform built specifically for MEP contracting companies. It follows a **Management by Exception** design principle — the interface stays quiet and neutral under normal conditions, but surfaces disputes, proxy check-ins, and project delays immediately so administrators can act fast.

The platform is designed to be used by company administrators and project managers to maintain a real-time pulse on all active sites, their workforce, attendance records, and project documentation.

---

## Features

### 🔐 Authentication & Access Control
- Email/password authentication powered by Convex Auth
- Role-based access: **Owner** (`admin@riverrtech.com`) and **Admin** accounts
- Invite-based onboarding — new admins set their own password on first login
- Password requirements enforced (minimum 8 characters)
- Invites are automatically consumed after first login to prevent reuse
- Browser-native email autocomplete support

### 👤 Admin Management (Owner Only)
- Invite new administrators by email
- Revoke pending invitations
- Remove active admin accounts (with confirmation modal)
- Protection against duplicate invites and inviting existing admins
- Owner account (`admin@riverrtech.com`) cannot be deleted
- Role badges displayed in the user list (Owner / Admin)

### 🏠 Dashboard
- Overview of active and completed projects
- Live workforce and attendance KPIs
- Quick navigation to any module

### 📁 Projects Hub
- Create, view, edit, and manage MEP projects
- GPS-based geolocation tagging for each site
- Project images and client details
- Mark projects as completed or reopen them
- All special characters allowed in project name and client fields

### 👷 Project Detail
- Deep-dive view for individual projects
- Manage assigned workers per project
- View blueprints, RFIs, and attendance for that project

### 👥 Workforce
- Global worker registry (Supervisors, Foremen, Technicians)
- Add/edit workers with role, mobile, and PIN
- Worker names support letters, spaces, and periods (e.g. "Dr. John")
- Mobile numbers displayed in workforce records
- Default PIN management with reset-to-default functionality
- Assign workers to multiple projects simultaneously

### 📋 Attendance Log
- Daily check-in/check-out records per project
- Supports **Self** and **Proxy** check-in types
- Status tracking: `Verified` / `Pending Approval`
- Visual flags for proxy attendance requiring admin review
- Monthly calendar view with color-coded attendance indicators

### 📐 Drawings (Blueprints)
- Upload and manage blueprint/drawing files per project
- Full version history with revision tracking
- Pin a specific revision as the "current" version
- Upload new revisions and track who uploaded them

### 📝 RFIs (Requests for Information)
- Log and track RFIs raised during project execution

### ⚙️ Settings
- Company profile (name, email, phone, address, logo)
- Configurable shift hours, late buffers, and auto-absent thresholds
- Work week and holiday management
- GPS geofencing radius configuration
- Alert thresholds for silent sites, proxy reminders, and dispute resolution
- Attendance rules (photo required, self clock-in, reason required)
- Manage admin users (Owner only)

### 🔔 Notifications
- Real-time notification panel
- Mark individual notifications as read or delete them

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) |
| **Build Tool** | [Vite 8](https://vite.dev/) |
| **Backend / Database** | [Convex](https://convex.dev/) (real-time backend-as-a-service) |
| **Authentication** | [Convex Auth](https://labs.convex.dev/auth) (email/password) |
| **Maps** | [Leaflet](https://leafletjs.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Linting** | [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) |
| **Styling** | Vanilla CSS with a custom design system |
| **Typography** | IBM Plex Sans (headings/KPIs) · Inter (body/tables) |

---

## Project Structure

```
MEPac/
├── .gitignore
├── LICENSE                    # Proprietary license — RiverrTech
├── README.md                  # This file
└── mepac-admin/               # Main application
    ├── convex/                # Convex backend (schema + mutations/queries)
    │   ├── schema.js          # Database schema
    │   ├── auth.js            # Convex Auth configuration
    │   ├── auth.config.js     # Auth provider config
    │   ├── http.js            # HTTP router for auth endpoints
    │   ├── adminUsers.js      # Admin user management (invite, RBAC, etc.)
    │   ├── projects.js
    │   ├── workers.js
    │   ├── assignments.js
    │   ├── checkIns.js
    │   ├── blueprints.js
    │   ├── notifications.js
    │   └── settings.js
    ├── public/
    │   └── images/
    │       └── logo.png       # MEPac logo
    ├── src/
    │   ├── App.jsx            # Root component + hash-based routing
    │   ├── main.jsx           # Entry point with Convex + Auth providers
    │   ├── index.css          # Global design system styles
    │   ├── components/
    │   │   ├── Layout/        # Sidebar, Topbar (with logged-in user info)
    │   │   ├── modals/        # All modal dialogs (add/edit project, worker, etc.)
    │   │   ├── notifications/ # Notifications panel
    │   │   └── LocationPicker # Map-based GPS picker
    │   └── views/
    │       ├── LoginPage.jsx      # Auth flow (login / set password for new admins)
    │       ├── ManageUsers.jsx    # Admin user management (Owner only)
    │       ├── Dashboard.jsx
    │       ├── ProjectsHub.jsx
    │       ├── ProjectDetail.jsx
    │       ├── Workforce.jsx
    │       ├── AttendanceLog.jsx
    │       ├── Drawings.jsx
    │       ├── RFIs.jsx
    │       └── Settings.jsx
    ├── package.json
    └── vite.config.js
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- A [Convex](https://convex.dev/) account (free tier is sufficient for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MEPac/mepac-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   Follow the prompts to log in and link/create a Convex project. This will populate your `.env.local` automatically.

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` by default.

### First-Time Setup

After deployment, the Owner account (`admin@riverrtech.com`) must be created first. This account has elevated privileges and is the only one that can:
- Invite new administrators
- Revoke pending invitations
- Remove existing admin accounts

All other admin accounts are created through the invite flow — the Owner sends an email invite, and the invited user sets their own password on first visit.

---

## Environment Variables

The following variables are required in `mepac-admin/.env.local`:

| Variable | Description |
|---|---|
| `VITE_CONVEX_URL` | Your Convex deployment URL (set automatically by `npx convex dev`) |

> **Note:** Never commit `.env.local` to version control. It is already listed in `.gitignore`.

---

## Scripts

All scripts are run from inside the `mepac-admin/` directory.

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server with HMR |
| `npm run build` | Build the production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint for code quality checks |

---

## Team

MEPac is developed and maintained by **RiverrTech** — an independent development team.

| Name | Role |
|---|---|
| Alfaaz Abdul Jaleel K | Team Member |
| Joel Benoy | Team Member |
| Mohammad Afsal M | Team Member |
| Amal Vinayan | Team Member |

---

## License

This project is proprietary software. All rights reserved by **RiverrTech**.

Unauthorized copying, distribution, modification, or commercial use of this software is strictly prohibited without the prior written consent of the owners.

See the [LICENSE](./LICENSE) file for full terms.
