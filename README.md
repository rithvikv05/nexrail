# NexRail

A modern train booking web app built with React, TypeScript, and Vite.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: PostgreSQL via Supabase (custom RPC functions)
- **Runtime**: Bun

## Getting Started

```sh
# Install dependencies
bun install

# Start dev server
bun run dev
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Search trains |
| Train Search | `/search` | Results + seat availability |
| Book | `/book` | Passenger details + payment |
| PNR Status | `/pnr` | Check booking status |
| Live Train | `/live` | Real-time train schedule |
| Train Schedule | `/schedule` | Full route timetable |
| Profile | `/profile` | User account + booking history |
| Login | `/login` | Sign in / Register |
| Database | `/database` | DB explorer + playground |
| Admin | `/admin` | Train management |

## Build

```sh
bun run build
bun run preview
```
