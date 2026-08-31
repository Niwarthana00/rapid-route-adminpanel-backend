# 🚌 Rapid Route Enterprise Transit — Backend REST API

High-performance Node.js / Express + TypeScript backend REST API powering the Rapid Route Enterprise Transit Admin Dashboard, connecting directly to PostgreSQL with schema namespaces (`core.*`, `biz.*`, `fin.*`, `system.*`).

---

## 🛠️ Tech Stack & Architecture

- **Runtime**: Node.js v20+ / TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15+ (`pg` connection pool)
- **Base URL**: `http://localhost:5000/api/v1`
- **CORS**: Configured for `http://localhost:5173` with credentials support
- **Schema**: Production schema in [01_schema.sql](file:///c:/Users/x13/Desktop/Projects/rapid-route-adminpanel-backend/01_schema.sql) (untouched & intact)

---

## ⚙️ Environment Configuration

Create or update `.env` in the root directory:

```env
PORT=5000
NODE_ENV=development

# PostgreSQL Connection Settings
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rapid_route

# Allowed Origins
CORS_ORIGIN=http://localhost:5173
```

---

## 🚀 Quick Start & Database Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database & Run Schema
Execute the schema loader to apply [01_schema.sql](file:///c:/Users/x13/Desktop/Projects/rapid-route-adminpanel-backend/01_schema.sql):
```bash
npm run db:init
```

### 3. Seed Realistic Sri Lankan Transit Data
Populates routes (EX 1-1, EX 1-2, 154, 138), expressway halts (Makumbura, Galle, Matara, Kadawatha), buses (WP ND-8812, WP NC-4491), drivers, active trips, bookings, and fare rules:
```bash
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```

The API will be live at `http://localhost:5000/api/v1` and health check at `http://localhost:5000/health`.

---

## 📡 REST API Endpoints Overview

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Dashboard** | `GET` | `/api/v1/dashboard/summary` | Real-time KPIs & metrics |
| | `GET` | `/api/v1/dashboard/live-fleet` | Live vehicle positions & telemetry |
| | `GET` | `/api/v1/dashboard/active-trips` | Active on-road trips |
| | `POST` | `/api/v1/dashboard/dispatch-replacement` | Dispatch replacement bus/driver |
| **Drivers** | `GET` | `/api/v1/drivers` | List all drivers |
| | `GET` | `/api/v1/drivers/:id` | Single driver profile |
| | `POST` | `/api/v1/drivers` | Register new driver |
| | `PUT` | `/api/v1/drivers/:id` | Update driver details |
| | `DELETE` | `/api/v1/drivers/:id` | Soft delete driver |
| | `GET` | `/api/v1/drivers/documents` | Driver licenses & medicals |
| | `POST` | `/api/v1/drivers/documents/:id/verify` | Verify driver document |
| **Fleet** | `GET` | `/api/v1/fleet/vehicles` | List all buses & compliance |
| | `GET` | `/api/v1/fleet/vehicles/:id` | Single vehicle detail |
| | `POST` | `/api/v1/fleet/vehicles` | Register vehicle |
| | `PUT` | `/api/v1/fleet/vehicles/:id` | Update vehicle |
| | `GET` | `/api/v1/fleet/maintenance` | Maintenance service history |
| | `POST` | `/api/v1/fleet/maintenance` | Log maintenance record |
| | `GET` | `/api/v1/fleet/assignments` | Driver-bus assignments |
| **Routes & Halts** | `GET` | `/api/v1/routes` | Routes with nested halt sequences |
| | `GET` | `/api/v1/routes/:id` | Route detail with halts |
| | `POST` | `/api/v1/routes` | Create transit route |
| | `PUT` | `/api/v1/routes/:id` | Update route |
| | `GET` | `/api/v1/halts` | List all transit stops |
| | `POST` | `/api/v1/halts` | Create new stop |
| **Schedules & Trips** | `GET` | `/api/v1/schedules` | Timetable master schedules |
| | `POST` | `/api/v1/schedules` | Create schedule |
| | `PUT` | `/api/v1/schedules/:id` | Update schedule |
| | `GET` | `/api/v1/trips` | Trips list |
| | `PATCH` | `/api/v1/trips/:id/status` | Update trip status & delay |
| | `GET` | `/api/v1/trips/:tripRef/logs` | Real-time halt logs & passenger counts |
| **Bookings** | `GET` | `/api/v1/bookings` | List bookings |
| | `GET` | `/api/v1/bookings/:id` | Booking detail |
| | `POST` | `/api/v1/bookings` | Create booking |
| | `POST` | `/api/v1/bookings/:id/cancel` | Cancel booking |
| | `GET` | `/api/v1/bookings/seat-map` | Vehicle seat layout & availability |
| **Passengers** | `GET` | `/api/v1/passengers` | Loyalty passengers |
| **Finance** | `GET` | `/api/v1/finance/fare-rules` | Fare matrix & AC surcharges |
| | `POST` | `/api/v1/finance/fare-rules` | Create fare rule |
| | `PUT` | `/api/v1/finance/fare-rules/:id` | Update fare rule |
| | `GET` | `/api/v1/finance/payments` | Payment transactions |
| | `GET` | `/api/v1/finance/revenue-facts` | Route revenue facts |
| | `GET` | `/api/v1/finance/revenue-trends` | 7-day revenue trend points |
| **System** | `GET` | `/api/v1/system/audit-logs` | Security audit events |
| | `GET` | `/api/v1/system/notifications` | Broadcast notifications |
| | `POST` | `/api/v1/system/notifications` | Send notification |
| | `GET` | `/api/v1/system/users` | Admin & system users |
| | `GET` | `/api/v1/system/header-notifications` | Unread notifications for header bar |
