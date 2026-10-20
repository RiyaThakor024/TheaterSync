# TheaterSync — Movie Ticket Booking System

TheaterSync is a movie ticket booking web application that allows users to browse movies, explore theaters and show timings, select seats, book tickets, and manage their bookings.

## Tech Stack

**Backend**
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT authentication
- bcrypt password hashing

**Frontend**
- React (frontend integration in progress)

## Project Structure

```text
TheaterSync/
├── backend/
│   ├── prisma/       # Prisma schema and migrations
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── lib/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── .env.example
├── frontend/
└── README.md
```

*Adjust the structure above if your actual folder names differ.*

## Backend Setup

### 1. Prerequisites

Install:
- Node.js and npm
- PostgreSQL

### 2. Clone the repository

```bash
git clone https://github.com/RiyaThakor024/TheaterSync.git
cd TheaterSync/backend
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file inside `backend/` using the project's `.env.example` as a reference.

Required variables:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/theater_sync?schema=public"
JWT_ACCESS_SECRET="replace_with_a_strong_random_secret"
JWT_REFRESH_SECRET="replace_with_a_different_strong_random_secret"
```

Replace the example database credentials and secrets with your own local values. Never commit your actual `.env` file.

### 5. Set up the database

Create a PostgreSQL database named `theater_sync`.

Run the existing migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

If the project has no committed migrations yet, coordinate with the backend developer before choosing a migration or schema-push workflow.

### 6. Start the backend

Use the development command defined in `backend/package.json`, for example:

```bash
npm run dev
```

The local API base URL is:

```text
http://localhost:5000/api
```

Health check:

```http
GET http://localhost:5000/api/health
```

## API Endpoints

All endpoints below are relative to `http://localhost:5000`.

### Authentication — `/api/auth`

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| POST | `/api/auth/register` | Register a user | No |
| POST | `/api/auth/login` | Log in | No |
| POST | `/api/auth/refresh` | Refresh access token | Refresh cookie |
| POST | `/api/auth/logout` | Log out | No |
| GET | `/api/auth/profile` | Get current user profile | Bearer token |
| POST | `/api/auth/forgot-password` | Request a password reset | No |
| POST | `/api/auth/reset-password` | Reset password with a valid token | No |

### Movies — `/api/movies`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/movies` | List movies |
| GET | `/api/movies/:id` | Get movie details |

Search and filters are available where supported by the backend implementation.

### Theaters — `/api/theaters`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/theaters` | List theaters |
| GET | `/api/theaters/:id` | Get theater details |
| POST | `/api/theaters` | Create a theater (admin) |
| PUT | `/api/theaters/:id` | Update a theater (admin) |
| DELETE | `/api/theaters/:id` | Delete a theater (admin) |

### Shows — `/api/shows`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/shows` | List shows |
| GET | `/api/shows/:id` | Get show details and seats |
| POST | `/api/shows` | Create a show (admin) |
| PUT | `/api/shows/:id` | Update a show (admin) |
| DELETE | `/api/shows/:id` | Delete a show (admin) |

### Bookings — `/api/bookings`

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| GET | `/api/bookings/my` | Get the current user's bookings | Bearer token |
| POST | `/api/bookings` | Book selected seats | Bearer token |
| POST | `/api/bookings/:bookingId/cancel` | Cancel a booking | Bearer token |

## Frontend Integration

Set the API base URL in the frontend configuration:

```typescript
const API_BASE_URL = "http://localhost:5000/api";
```

Example request using `fetch`:

```typescript
const response = await fetch(`${API_BASE_URL}/movies`);
const result = await response.json();

if (!response.ok) {
  throw new Error(result.message || "Failed to fetch movies");
}

console.log(result);
```

For protected endpoints, send the access token:

```typescript
const response = await fetch(`${API_BASE_URL}/bookings/my`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

The login endpoint also sets an HTTP-only refresh-token cookie. If the frontend and backend use different local origins, coordinate CORS settings and cookie credentials. Do not try to read the HTTP-only cookie from JavaScript.

## Important Notes for the Frontend Developer

- Use `GET /api/movies` to populate the movie listing.
- Use `GET /api/movies/:id` for movie details.
- Use `GET /api/shows?movieId=:id` to retrieve shows for a movie.
- Use `GET /api/shows/:id` to retrieve show details and seat availability.
- Send selected seat numbers to `POST /api/bookings`.
- Use `GET /api/bookings/my` to display booking history.
- Use `POST /api/bookings/:bookingId/cancel` to cancel a booking.
- Admin endpoints require an admin access token.
- Request and response field names should be confirmed against the current backend routes.

## Password Reset in Local Development

The forgot-password endpoint currently logs the reset token in the backend terminal for local testing. Real email delivery is not configured yet. Do not expose reset tokens in production.

## Security

- Never commit `.env`, passwords, database credentials, JWT secrets, or access tokens.
- Use your own local environment variables.
- Do not store passwords as plain text.
- Keep access tokens and refresh tokens secure.

## Repository

GitHub: https://github.com/RiyaThakor024/TheaterSync
