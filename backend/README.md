# NYR Bingo Backend

Backend API for New Year Resolution Bingo application.

## Tech Stack

- Node.js + Express + TypeScript
- MariaDB
- JWT Authentication

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Create MariaDB database:
```sql
CREATE DATABASE nyr_bingo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. Run database migrations:
```bash
mysql -u root -p nyr_bingo < migrations/001_initial_schema.sql
```

5. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### Profile
- `GET /api/profile/me` - Get own profile
- `PUT /api/profile/me` - Update own profile
- `PUT /api/profile/me/privacy` - Update privacy settings
- `GET /api/profile/:userId` - Get user's public profile

### Personal Resolutions
- `POST /api/resolutions` - Create resolution
- `GET /api/resolutions` - List own resolutions
- `GET /api/resolutions/:id` - Get resolution
- `PUT /api/resolutions/:id` - Update resolution
- `DELETE /api/resolutions/:id` - Delete resolution

### Teams
- `POST /api/teams` - Create team
- `GET /api/teams` - Get my teams
- `GET /api/teams/:teamId` - Get team details
- `PUT /api/teams/:teamId/resolution` - Set team resolution
- `POST /api/teams/:teamId/invitations` - Create invitation
- `POST /api/teams/join` - Join team with invite code

### Team Provided Resolutions
- `POST /api/teams/:teamId/provided-resolutions` - Create resolution for team member
- `GET /api/teams/:teamId/provided-resolutions/to-create` - Get list of members to create resolutions for
- `GET /api/teams/:teamId/provided-resolutions/for-me` - Get resolutions created for me

### Bingo Game
- `POST /api/teams/:teamId/start-bingo` - Start bingo game (team leader only)
- `GET /api/teams/:teamId/my-card` - Get my bingo card
- `GET /api/teams/:teamId/cards` - Get all team bingo cards
- `GET /api/teams/:teamId/cards/:userId` - Get specific user's card

### Gameplay
- `PUT /api/teams/cells/:cellId/state` - Update cell state (completed/to_complete)

### Proofs
- `POST /api/teams/cells/:cellId/proofs` - Submit proof (multipart/form-data)
- `GET /api/teams/cells/:cellId/proofs` - Get proofs for cell
- `PUT /api/teams/proofs/:proofId/approve` - Approve proof
- `PUT /api/teams/proofs/:proofId/decline` - Decline proof with comment

## Development

```bash
npm run dev    # Start with hot reload
npm run build  # Build TypeScript
npm start      # Start production server
```

## Database Schema

See `migrations/001_initial_schema.sql` for complete schema definition.

Key tables:
- users, user_profiles
- personal_resolutions
- teams, team_memberships, team_invitations
- team_provided_resolutions
- bingo_cards, bingo_card_cells
- proofs
- duplicate_reports
