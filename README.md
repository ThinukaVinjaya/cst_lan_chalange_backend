# CST LAN Challenge 2026 – Production Backend API

Official tournament backend service for **CST LAN Challenge 2026 (Counter-Strike 2)**, hosted by the Computer Science and Technology Degree Programme, Faculty of Applied Sciences, Uva Wellassa University of Sri Lanka (UWU).

---

## 1. System Architecture

- **Runtime & Language**: Node.js, Express.js, TypeScript
- **Database**: MongoDB Atlas via Mongoose
- **Authentication**: JWT stored in HTTP-Only cookies (`cst_admin_token`) or `Authorization: Bearer <token>`
- **Security**: Helmet, CORS with whitelist, Express Rate Limiter, Zod Request Validation
- **Media Uploads**: Multer memory storage with Cloudinary cloud storage
- **Real-Time Projection**: Cross-tab `BroadcastChannel` (<10ms sync) & REST telemetry polling

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts        # MongoDB Atlas connection & fallback handling
│   │   ├── cloudinary.ts      # Cloudinary upload SDK configuration
│   │   └── environment.ts     # Validates required environment variables
│   ├── models/
│   │   ├── Admin.ts           # Admin accounts with bcrypt password hashing
│   │   ├── Registration.ts    # Enlisted collegiate squads & 5-man rosters
│   │   ├── Team.ts            # Participating squads, rankings, round differentials
│   │   ├── Match.ts           # Fixtures, live scoring, C4 alert, sides (CT/T)
│   │   ├── TournamentSettings.ts # Tournament countdown dates, status banner
│   │   └── AuditLog.ts        # Detailed administrative audit trail
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── registrationController.ts
│   │   ├── teamController.ts
│   │   ├── matchController.ts
│   │   ├── scoreboardController.ts
│   │   ├── settingsController.ts
│   │   └── dashboardController.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── registrationService.ts
│   │   ├── scoreboardService.ts
│   │   ├── auditService.ts
│   │   └── cloudinaryService.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── publicRoutes.ts
│   │   ├── registrationRoutes.ts
│   │   ├── adminRoutes.ts
│   │   └── ...
│   ├── middleware/
│   │   ├── authenticate.ts    # JWT token verification
│   │   ├── authorizeAdmin.ts  # Role-based access control (SUPER_ADMIN, etc.)
│   │   ├── validateRequest.ts # Zod schema validation
│   │   ├── errorHandler.ts    # Standard JSON error responses
│   │   ├── rateLimiter.ts     # Request rate limits
│   │   └── upload.ts          # Multer image parser
│   ├── scripts/
│   │   ├── createAdmin.ts     # Seed super admin
│   │   └── seedData.ts        # Seed tournament squads, matches, standings
│   ├── app.ts                 # Express application definition
│   └── server.ts              # Server startup
├── test/
│   └── api.test.ts            # API integration test suite
├── .env.example
├── .env
├── package.json
└── tsconfig.json
```

---

## 3. Environment Variables Configuration

The `.env` file in `backend/.env` requires:

```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.padgsa0.mongodb.net/cst_lan_challenge_2026?retryWrites=true&w=majority

# JWT Token Secret & Lifetime
JWT_SECRET=cst_lan_challenge_super_secure_jwt_secret_key_2026_uwu_cs2_esports
JWT_EXPIRES_IN=1d

# Cloudinary Credentials (For Squad Logos)
CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET

# Frontend Allowed Origin
FRONTEND_URL=http://localhost:3000

# Initial Admin Credentials
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@cst.uwu.ac.lk
ADMIN_PASSWORD=admin12345
```

> **IMPORTANT: MongoDB Atlas IP Access List**
> If you encounter `MongooseServerSelectionError`, make sure your IP is whitelisted in MongoDB Atlas:
> 1. Go to [MongoDB Atlas Console](https://cloud.mongodb.com/).
> 2. Under **Security**, click **Network Access**.
> 3. Click **Add IP Address** -> Select **Allow Access From Anywhere (`0.0.0.0/0`)** -> Click **Confirm**.

---

## 4. API Reference

### A. Authentication
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Administrator sign-in (issues HTTP-only cookie + Bearer token) | Public |
| `POST` | `/api/auth/logout` | Clears authentication cookie | Admin |
| `GET` | `/api/auth/me` | Current authenticated administrator profile | Admin |

### B. Public Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/public/settings` | Tournament countdown dates, status banner |
| `GET` | `/api/public/teams` | Approved participating university squads |
| `GET` | `/api/public/teams/:id` | Specific team details and 5-man roster |
| `GET` | `/api/public/matches` | Filter fixtures (`status=upcoming`, `live`, `completed`) |
| `GET` | `/api/public/scoreboard` | Comprehensive stage projector & audience scoreboard payload |
| `GET` | `/api/public/standings` | Collegiate leaderboard ordered by points & round differentials |

### C. Registration
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/registrations` | Squad registration submission (with 5 players + captain + logo) |
| `GET` | `/api/registrations/:id` | Check public status of an enlistment |

### D. Admin Endpoints (Require Admin JWT)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard/overview` | KPI telemetry (registrations, matches, teams count) |
| `GET` | `/api/admin/dashboard/activity` | Security audit trail logs |
| `GET` | `/api/admin/registrations` | Roster dossiers with search, filter, pagination |
| `PATCH` | `/api/admin/registrations/:id/approve` | Approve squad -> enrolls in official tournament |
| `PATCH` | `/api/admin/registrations/:id/reject` | Reject squad with reason |
| `GET` | `/api/admin/teams` | Team-wise squad rosters with starters & substitutes |
| `PATCH` | `/api/admin/teams/:id/status` | Activate / deactivate squad |
| `GET` | `/api/admin/matches` | All fixtures |
| `POST` | `/api/admin/matches` | Schedule new match |
| `PATCH` | `/api/admin/matches/:id/score` | Real-time score update (1-click referee adjustment) |
| `POST` | `/api/admin/matches/:id/publish` | Ratify final score -> auto-recalculates standings |
| `DELETE` | `/api/admin/matches/:id` | Delete match fixture |
| `GET` | `/api/admin/settings` | Fetch tournament settings |
| `PATCH` | `/api/admin/settings` | Update tournament target dates and announcement text |

---

## 5. Development & Testing Commands

Inside `backend/`:

```bash
# Install dependencies
npm install

# Start backend in development mode (hot reloading on port 5000)
npm run dev

# Run comprehensive test suite
npm test

# Build production TypeScript output (dist/)
npm run build

# Start production server
npm start

# Seed default admin user
npm run seed:admin

# Seed full tournament demonstration data (6 squads, matches, standings)
npm run seed
```

---

## 6. Full-Stack Launcher

To launch both the Next.js frontend (Port 3000) and the Express backend (Port 5000) concurrently, run from the root project directory:

```cmd
run-fullstack.bat
```

