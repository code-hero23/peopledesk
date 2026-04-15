# API Documentation - PeopleDesk

The PeopleDesk API is a RESTful service that powers the frontend dashboard and mobile application. All endpoints are prefixed with `/api`.

## 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/login` | Authenticate user & return JWT token | No |
| POST | `/register` | (Admin only) Create a new user | Yes |
| GET | `/me` | Get current user profile | Yes |
| POST | `/forgot-password` | Initiate password reset flow | No |

---

## 📅 Attendance (`/api/attendance`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/checkin` | Capture check-in with photo | Yes |
| POST | `/checkout` | Update check-out time | Yes |
| GET | `/logs` | Get personal/team attendance logs | Yes |
| POST | `/sync-biometric` | (Admin/HR) Sync from external logs | Yes |
| POST | `/break/start` | Start a break (Lunch, Meeting) | Yes |
| POST | `/break/end` | End current break | Yes |

---

## 📈 Work Logs (`/api/worklogs`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/` | Submit a daily work log | Yes |
| GET | `/history` | View historical work logs | Yes |
| GET | `/project/:id` | Get logs for a specific project | Yes |

---

## 🎟 Vouchers & Finance (`/api/vouchers`, `/api/finance`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/vouchers` | Create a new voucher request | Yes |
| PATCH | `/vouchers/:id/approve` | Approve/Reject voucher (AM/COO) | Yes |
| GET | `/finance/status` | Get current cash balance (Admin) | Yes |
| POST | `/finance/deposit` | Add cash to floating fund | Yes |

---

## 📝 Admin & HR (`/api/admin`)

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| GET | `/users` | List all system users | HR/ADMIN |
| PATCH | `/users/:id/role` | Update user permissions | ADMIN |
| GET | `/audit-logs` | View system activity logs | ADMIN |
| POST | `/settings/global` | Update system-wide constants | ADMIN |

---

## 🚀 Other Modules

-   **`/api/notifications`**: Manage push and in-app alerts.
-   **`/api/requests`**: Leave, Permission, and Visit requests.
-   **`/api/wfh`**: Deep-structured Work From Home applications.
-   **`/api/export`**: Generate Excel/CSV reports for payroll and attendance.
-   **`/api/helpdesk`**: Employee ticketing system.

## 🛠 Usage
All protected requests must include the `Authorization` header:
`Authorization: Bearer <your_jwt_token>`
