# System Architecture - PeopleDesk

This document provides a technical overview of the PeopleDesk architecture, data flow, and core module logic.

## 🏗 High-Level Overview

PeopleDesk follows a decoupled **Client-Server** architecture:

1.  **Frontend (Client)**: A React-based Single Page Application (SPA) utilizing Redux for state management and Vite for build optimization. Mobile functionality is provided via Capacitor.
2.  **Backend (Server)**: A RESTful Express.js API powered by Node.js, using Prisma ORM to interface with the database.
3.  **Database**: PostgreSql/MySQL is used for persistent storage, with a complex schema handling multi-faceted HRM data points.

---

## 🚦 Core Logic Flows

### 1. Unified Attendance Logic
The attendance system is designed to handle multiple input sources (Manual Check-in, Biometric Imports).
- **Check-in Process**: Captures photo + GPS coordinates + IP Address.
- **Biometric Sync**: Reconciles external biometric IDs with internal `User` records.
- **Calculation Engine**: `server/src/services/attendanceService.js` (hypothetical path) calculates active hours by subtracting break durations from the total `CheckOut - CheckIn` span.

### 2. Multi-Level Approval Workflow (Vouchers)
The Voucher system uses a sequential approval chain:
1.  **Request**: Employee creates a `Voucher` (e.g., Petrol, Food).
2.  **Level 1 (AM)**: Accounts Manager reviews and appends `amStatus`.
3.  **Level 2 (COO)**: Chief Operating Officer reviews `cooStatus`.
4.  **Finalization**: Once approved at both levels, the Finance module updates `currentCash` and marks the voucher as `PAID`.

### 3. Role-Based Access Control (RBAC)
Roles are defined in `prisma/schema.prisma` and enforced via backend middleware:
- **EMPLOYEE**: Can view personal dashboard, logs, and requests.
- **BUSINESS_HEAD (BH)**: Can see subordinates, approve leaves/visits for their team.
- **HR**: Manages user profiles, global attendance, and policy settings.
- **ADMIN**: Full access to finance, payroll, and system configuration.

---

## 📊 Data Model Highlights

### User Model
The central hub of the system. Contains profile info, role, salary details, and relations to every other module.

### WorkLog Model
Captures daily productivity metrics. Features dynamic JSON fields (`cre_opening_metrics`, `fa_closing_metrics`) to handle department-specific KPIs (e.g., FA vs. CRE workflows).

### Finance Model
A singleton record (ID: 1) tracking the company's floating cash balance. Every voucher payout or manual deposit updates this record.

---

## 📡 Integrations

- **WhatsApp API**: Triggered for high-priority alerts (e.g., Site Visit approvals).
- **SMTP (Nodemailer)**: Sends formatted HTML emails for salary slips and request updates.
- **Web Push API**: Provides real-time notifications to the browser and mobile app using service workers.

---

## 🔄 Deployment Flow

Refer to [VPS_REDEPLOY_GUIDE.md](file:///C:/Users/aravi/Pictures/people-desk/VPS_REDEPLOY_GUIDE.md) for automated deployment scripts and PM2 configuration.
