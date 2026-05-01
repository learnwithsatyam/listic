# Listic Admin Panel

Admin dashboard for managing users, revenue analytics, and platform control.

## Setup

```bash
# From workspace root
cd apps/admin
npm install

# Create .env.local
cp .env.example .env.local
# Edit .env.local and set VITE_API_URL to your API

# Run development server
npm run dev
```

## Promote yourself to admin

Before you can log into the admin panel, promote your user account:

```bash
DATABASE_URL=your_database_url node apps/api/make-admin.js your@email.com
```

## API Endpoints

All admin endpoints require JWT auth + admin role (`isAdmin: true` on user).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Overview stats |
| GET | `/api/admin/activity?limit=20` | Recent activity |
| GET | `/api/admin/revenue?year=&month=` | Revenue breakdown |
| GET | `/api/admin/revenue/monthly?year=` | Monthly chart data |
| GET | `/api/admin/users?page=&limit=&search=` | Paginated users |
| GET | `/api/admin/users/:id` | User detail with payments & projects |
| PATCH | `/api/admin/users/:id/credits` | Update user credits |
| PATCH | `/api/admin/users/:id/admin` | Toggle admin role |

## Deploying to admin.listic.in

### Vercel (recommended)

1. Push the code to GitHub
2. Create a new Vercel project pointing to `apps/admin`
3. Set environment variable: `VITE_API_URL=https://your-api.fly.dev/api`
4. Add custom domain: `admin.listic.in`
5. Add `https://admin.listic.in` to your API's `CORS_ORIGINS` env var

### API CORS config

Add the admin domain to `CORS_ORIGINS` on your Fly.io API:

```bash
fly secrets set CORS_ORIGINS="https://listic.in,https://admin.listic.in" --app your-api-app
```

## Features

- **Dashboard**: Total users, revenue, paying users, projects overview, recent activity
- **Users**: Searchable paginated list, view detail, manage credits, toggle admin
- **Revenue**: All-time & monthly revenue charts, tier breakdown, full payment history with filters
- **User Detail**: Per-user payment history, project list, credit management
