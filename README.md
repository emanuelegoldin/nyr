# New Year Resolution Bingo - Full Application

A team-based bingo game application where users create resolutions for each other and track their progress.

## Project Structure

```
nyr/
├── backend/          # Node.js + Express + TypeScript API
├── nyr-app/          # Vite + React + TypeScript frontend
└── AGENTS.md         # Development workflow and domain rules
```

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: MariaDB
- **Authentication**: JWT tokens
- **Target**: Ubuntu Server

## Features Implemented

### Authentication (Spec 01)
- ✅ User registration with email/password
- ✅ Email verification required before login
- ✅ JWT-based authentication
- ✅ Session management

### User Profile & Privacy (Spec 02)
- ✅ Profile management (first/last name, bio, avatar)
- ✅ Per-field privacy settings (public/private)
- ✅ View other users' public profiles

### Personal Resolutions (Spec 03)
- ✅ Create, read, update, delete personal resolutions
- ✅ Owner-only modification

### Bingo Teams (Spec 04)
- ✅ Create teams with leader role
- ✅ Invite system with unique codes
- ✅ Team membership management
- ✅ Team resolution definition
- ✅ Member-to-member resolution creation
- ✅ Start game validation (all members must create resolutions for all others)

### Bingo Card Generation (Spec 05)
- ✅ 5x5 grid generation
- ✅ Joker cell in center with team resolution
- ✅ Member-provided resolutions prioritized
- ✅ Personal resolutions as fallback
- ✅ Empty cells when insufficient resolutions
- ✅ Duplicate reporting structure (schema ready)

### Bingo Gameplay (Spec 06)
- ✅ Mark cells completed/to_complete
- ✅ Empty cells cannot be marked
- ✅ Owner-only card modifications
- ✅ View own card state

### Proof & Approval (Spec 07)
- ✅ Upload proof (image files)
- ✅ Team member review workflow
- ✅ Approve/decline with comments
- ✅ Proof status tracking (pending/approved/declined)

### Visibility & Updates (Spec 08)
- ✅ View other team members' bingo cards
- ✅ Team-only access to cards
- ✅ Real-time-ready structure (polling can be implemented)

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- MariaDB 10.5+
- Git

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create database:
```sql
CREATE DATABASE nyr_bingo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. Run migrations:
```bash
mysql -u root -p nyr_bingo < migrations/001_initial_schema.sql
```

5. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

6. Start backend:
```bash
npm run dev  # Development mode with hot reload
npm run build && npm start  # Production mode
```

Backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd nyr-app
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env if backend is not on localhost:3000
```

4. Start frontend:
```bash
npm run dev  # Development mode
npm run build  # Production build
```

Frontend will run on `http://localhost:5173`

## API Documentation

Complete API documentation is available in `backend/README.md`.

Base URL: `http://localhost:3000/api`

### Authentication Headers

Protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

## Domain Rules (Critical)

The following rules are enforced per `AGENTS.md`:

1. **Game Start**: Can only start when all team members have created resolutions for all other members
2. **Bingo Cards**: 5x5 grid, joker in center, immutable after generation (except state)
3. **Resolution States**: `to_complete` → `completed` (reversible)
4. **Proof States**: `pending` → `approved` OR `declined`
5. **Empty Cells**: Cannot be marked as completed
6. **Authorization**: Users can only modify their own data; team actions verify membership

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation on all endpoints
- Owner-only modifications enforced
- Team membership verification
- SQL injection prevention (parameterized queries)

## Database Schema

Complete schema in `backend/migrations/001_initial_schema.sql`:

- users, user_profiles
- email_verification_tokens
- personal_resolutions
- teams, team_memberships, team_invitations
- team_provided_resolutions
- bingo_cards, bingo_card_cells
- proofs, duplicate_reports

## Testing

To test the application:

1. Register a new user
2. Verify email (check backend logs for token)
3. Login and create personal resolutions
4. Create a team
5. Invite other users (use invite code)
6. Each member creates resolutions for others
7. Team leader starts bingo
8. View and interact with bingo cards
9. Upload proofs and get approval

## Production Deployment (Ubuntu)

1. Install Node.js, npm, and MariaDB
2. Clone repository
3. Setup backend with production environment variables
4. Run database migrations
5. Build frontend: `npm run build` in nyr-app/
6. Serve static files from `nyr-app/dist/`
7. Use nginx as reverse proxy
8. Use PM2 for process management

## Known Limitations

- Email sending requires SMTP configuration
- File uploads stored locally (consider cloud storage for production)
- Real-time updates require implementation (WebSocket or polling)
- Duplicate resolution replacement UI not fully implemented (backend ready)

## License

Proprietary - All rights reserved
