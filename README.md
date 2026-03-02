# NexRail 🚆

A full-stack Indian railway management system built as a **DBMS course project**. The application demonstrates real-world SQL design — normalized schema, stored procedures, joins, aggregates, and a live query terminal — all backed by a PostgreSQL database on Supabase.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Animations | Framer Motion |
| Database | PostgreSQL (Supabase) |
| DB Client | `@supabase/supabase-js` (RPC calls only) |
| Auth | Custom SQL-based auth (`login_user`, `register_user` stored procedures) |

---

## Database Design

### ER Diagram

```
zone ──────< station >────── train_route >────── train
                                                   │
                              seat_availability ───┤
                                                   │
users ─────< search_history                        │
  │                                                │
  └──< ticket_reservation >──< passenger           │
            │    └───────────────────── class ─────┘
            │
       payment_info
```

### Tables (12 total)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `zone` | Railway administrative zones | `zone_id` PK |
| `station` | All railway stations | `station_code` PK, `zone_id` FK |
| `users` | Registered passenger accounts | `user_id` PK, `email`, `password` |
| `class` | Coach classes (SL, 3A, 2A, 1A, CC, EC) | `class_id` PK, `class_code` |
| `train` | Master train records | `train_no` PK, `source_station_id` FK, `destination_station_id` FK |
| `train_route` | Via-station stops per train | `train_code` FK → train, `via_station_code` FK → station |
| `train_fare` | Fixed fare per class | `class_id` FK → class |
| `seat_availability` | Seats per class per journey date | `train_code` FK, `journey_date` |
| `ticket_reservation` | Booking header — one row per PNR | `pnr_no` PK |
| `passenger` | Per-passenger detail rows | `pnr_no` FK → ticket_reservation |
| `payment_info` | Payment records | `transaction_number` PK, `pnr_no` FK |
| `search_history` | User search log | composite — `userid`, `from_stationid`, `to_stationid` |

Full DDL → [`database/schema.sql`](database/schema.sql)

---

### Stored Procedures / Functions (32 total)

All application logic lives in the database as PostgreSQL functions, called over PostgREST RPC.

#### Auth & User Management

| Function | Type | Description |
|----------|------|-------------|
| `register_user` | INSERT | Creates a new account after email-uniqueness check |
| `login_user` | SELECT | Validates credentials, returns user info |
| `check_email_exists` | SELECT | Returns `BOOLEAN` — used for duplicate check on signup |
| `get_user_profile` | SELECT | Fetches name, email, phone, age, gender |
| `update_user_profile` | UPDATE | Updates profile fields |
| `change_password` | UPDATE | Updates hashed password |
| `delete_user` | DELETE | Cascades deletion of all user data |

#### Train Search

| Function | Type | Description |
|----------|------|-------------|
| `search_trains` | SELECT | Multi-join query across `train`, `train_route`, `station` — returns trains between two cities on a given weekday |
| `fetch_from_stations` | SELECT | `ILIKE` prefix autocomplete on `station.station_name` |
| `get_train_schedule` | SELECT | Full stop list for a train with `ROW_NUMBER()` ordering |
| `check_seat_availability` | SELECT | Reads `seat_availability` for a train + class + date |
| `get_fare` | SELECT | Joins `train_fare` ↔ `class` to return fixed fare |

#### Booking Flow

| Function | Type | Description |
|----------|------|-------------|
| `create_reservation` | INSERT | Calculates distance, generates PNR, inserts into `ticket_reservation` |
| `add_passenger` | INSERT | Adds a passenger row under a PNR |
| `make_payment` | INSERT | Creates `payment_info` row with status `Waiting` |
| `confirm_booking` | UPDATE | Sets `confirmation_status = 'Confirmed'` |
| `update_seat_availability` | UPDATE | Decrements seat count after booking |
| `get_pnr_details` | SELECT | 4-table join to retrieve full ticket + passenger + payment info |
| `fetch_user_reservations` | SELECT | All bookings for a user account |
| `add_to_search_table` | INSERT | Logs a search query to `search_history` |

#### Admin Panel

| Function | Type | Description |
|----------|------|-------------|
| `admin_create_train` | INSERT | Adds a new train with all metadata |
| `admin_add_stop` | INSERT | Appends a via-station stop to a train route |
| `admin_add_seat_avail` | INSERT | Seeds seat counts for a date |
| `admin_delete_train` | DELETE | Cascades deletion across 5 tables |

Full function definitions → [`database/functions.sql`](database/functions.sql)

---

## Key DBMS Concepts Demonstrated

- **Normalization** — Schema is in 3NF; no transitive dependencies
- **Foreign Keys & Referential Integrity** — All relationships enforced at the DB level
- **Stored Procedures** — All DML and queries abstracted as PL/pgSQL / SQL functions
- **Joins** — Up to 4-table joins in `get_pnr_details`, `search_trains`, `get_train_schedule`
- **Window Functions** — `ROW_NUMBER() OVER (ORDER BY km_from_origin)` in `get_train_schedule`
- **Aggregates** — Seat count arithmetic in `update_seat_availability`
- **Transactions** — Booking flow spans `create_reservation` → `add_passenger` → `make_payment` → `confirm_booking`
- **Cascade Deletes** — `admin_delete_train` and `delete_user` manually cascade through child tables
- **ILIKE / Pattern Matching** — Station autocomplete with `ILIKE input || '%'`
- **Sequences** — Auto-increment PKs via `nextval(seq)`

---

## Application Pages

| Route | Page | DB Operations |
|-------|------|---------------|
| `/` | Home + Train Search | `fetch_from_stations`, `search_trains`, `add_to_search_table` |
| `/trains` | Search Results | `check_seat_availability` |
| `/book` | Booking Flow | `get_fare`, `create_reservation`, `add_passenger`, `make_payment`, `confirm_booking`, `update_seat_availability` |
| `/pnr-status` | PNR Status | `get_pnr_details` |
| `/train-schedule` | Train Schedule | `get_train_schedule` |
| `/train-schedule` | Timetable | `get_train_schedule` |
| `/profile` | User Profile | `get_user_profile`, `fetch_user_reservations`, `update_user_profile`, `change_password`, `delete_user` |
| `/login` | Auth | `check_email_exists`, `register_user`, `login_user` |
| `/admin` | Admin Dashboard | `admin_create_train`, `admin_add_stop`, `admin_add_seat_avail`, `admin_delete_train` |
| `/database` | Live DB Terminal | Real-time RPC log, ER diagram, function explorer, playground |

---

## Project Structure

```
nexrail/
├── database/
│   ├── schema.sql          # All CREATE TABLE statements (12 tables)
│   └── functions.sql       # All stored procedures (32 functions)
├── src/
│   ├── pages/              # One file per route
│   ├── components/         # Navbar, HeroSearch, Footer, shadcn/ui
│   ├── contexts/           # AuthContext (session via localStorage)
│   └── lib/
│       └── supabase.ts     # Supabase client
└── vite.config.ts
```

---

## Running Locally

```sh
bun install
bun run dev        # http://localhost:8080
bun run build      # production build
```

No `.env` setup needed — the Supabase anon key is public by design (row-level security enforced on the DB).
