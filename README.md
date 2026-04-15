# PeopleDesk - High-Fidelity HRM System

PeopleDesk is a comprehensive, real-time Human Resource Management (HRM) system built for modern workplaces. It features a cross-platform architecture (Web & Mobile) and automates complex workflows like attendance tracking, payroll, and performance analytics.

## 🚀 Quick Start (5 Minutes)

1. **Clone & Install**:
   ```bash
   git clone <your-repo-url>
   cd people-desk
   # Install dependencies for both parts
   cd server && npm install
   cd ../client && npm install
   ```

2. **Configure Environment**:
   - Copy `.env.example` to `.env` in both `client/` and `server/` folders.
   - Update `DATABASE_URL` in `server/.env` with your PostgreSQL credentials.

3. **Database Setup**:
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   npx prisma db seed # Optional: for initial data
   ```

4. **Run the Application**:
   - **Backend**: `cd server && npm run dev`
   - **Frontend**: `cd client && npm run dev`

5. **Access**:
   - Web: `http://localhost:5173`
   - API Docs: `http://localhost:5000/api`

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Redux Toolkit, Framer Motion, Recharts, Lucide Icons |
| **Backend** | Node.js, Express, Prisma ORM |
| **Database** | PostgreSQL / MySQL |
| **Styling** | Tailwind CSS 4 |
| **Mobile** | Capacitor (Android support) |
| **Utilities** | Bcrypt (Auth), JWT, Multer (Uploads), Node-Cron (Tasks) |

---

## 📂 Project Structure

```text
├── client/              # React frontend & Mobile config
│   ├── src/             # Frontend source code (pages, components, redux)
│   ├── android/         # Android Studio project (Capacitor)
│   └── public/          # Static assets
├── server/              # Express backend
│   ├── src/             # Backend source code (routes, controllers, services)
│   ├── prisma/          # Database schema and migrations
│   └── uploads/         # Local file storage (documents, photos)
└──Root Scripts          # Deployment and data management scripts
```

---

## 🌟 Key Features

### 1. Unified Attendance
- Real-time check-in/out with photo verification.
- Biometric log integration (CSV/Excel import).
- Break tracking (Lunch, Meeting, etc.) with automated alerts.

### 2. Smart Payroll & Finance
- Automated salary generation based on attendance and shortage deductions.
- Voucher management system with multi-level approval (AM -> COO -> Admin).
- Manual payroll overrides and bonus tracking.

### 3. Reporting & Analytics
- Real-time dashboard for Admins (Presence, Revenue, Performance).
- Site visit and Showroom visit request workflows.
- Performance scoring (Efficiency, Consistency, Quality).

### 4. Advanced Notifications
- Push Notifications via Web-Push.
- Automated WhatsApp notifications for triggers.
- Email alerts for leave and voucher approvals.

---

## 🏛 Architecture & API

- For technical design: [ARCHITECTURE.md](file:///C:/Users/aravi/Pictures/people-desk/ARCHITECTURE.md)
- For API reference: [API_DOCS.md](file:///C:/Users/aravi/Pictures/people-desk/API_DOCS.md)
- For contribution: [CONTRIBUTING.md](file:///C:/Users/aravi/Pictures/people-desk/CONTRIBUTING.md)

---

## 📄 License
Copyright (c) 2026. All rights reserved.
