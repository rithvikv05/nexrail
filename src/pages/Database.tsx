import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database as DbIcon, Table2, FunctionSquare, GitFork, Terminal, ChevronDown, ChevronRight, Circle, Loader2, Play, TriangleAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

// ─── Schema definitions ───────────────────────────────────────────────────────

const TABLES = [
  {
    name: "users",
    description: "Registered passenger accounts",
    color: "#f97316",
    columns: [
      { name: "user_id",  type: "SERIAL",   pk: true,  fk: false, nullable: false, note: "Auto-increment PK" },
      { name: "name",     type: "TEXT",     pk: false, fk: false, nullable: true,  note: "CHECK: not empty" },
      { name: "phone",    type: "TEXT",     pk: false, fk: false, nullable: true,  note: "CHECK: 10-digit format" },
      { name: "age",      type: "INTEGER",  pk: false, fk: false, nullable: true,  note: "CHECK: 0–120" },
      { name: "gender",   type: "TEXT",     pk: false, fk: false, nullable: true,  note: "CHECK: M/F/O" },
      { name: "email",    type: "TEXT",     pk: false, fk: false, nullable: true,  note: "CHECK: email format" },
      { name: "password", type: "TEXT",     pk: false, fk: false, nullable: true,  note: "Plaintext; CHECK: not empty" },
    ],
  },
  {
    name: "zone",
    description: "Railway administrative zones",
    color: "#c2410c",
    columns: [
      { name: "zone_id",   type: "TEXT", pk: true,  fk: false, nullable: false, note: "PK" },
      { name: "zone_name", type: "TEXT", pk: false, fk: false, nullable: true,  note: "" },
    ],
  },
  {
    name: "station",
    description: "Railway stations with zone association",
    color: "#9a3412",
    columns: [
      { name: "station_code", type: "TEXT", pk: true,  fk: false, nullable: false, note: "PK" },
      { name: "station_name", type: "TEXT", pk: false, fk: false, nullable: true,  note: "UNIQUE" },
      { name: "city",         type: "TEXT", pk: false, fk: false, nullable: true,  note: "" },
      { name: "state",        type: "TEXT", pk: false, fk: false, nullable: true,  note: "" },
      { name: "zone_id",      type: "TEXT", pk: false, fk: true,  nullable: true,  note: "→ zone" },
    ],
  },
  {
    name: "class",
    description: "Coach classes with seat configuration",
    color: "#b45309",
    columns: [
      { name: "class_id",       type: "SERIAL",  pk: true,  fk: false, nullable: false, note: "Auto-increment PK" },
      { name: "class_code",     type: "TEXT",    pk: false, fk: false, nullable: true,  note: "e.g. SL, 3A" },
      { name: "class_name",     type: "TEXT",    pk: false, fk: false, nullable: true,  note: "" },
      { name: "seats_per_coach",type: "INTEGER", pk: false, fk: false, nullable: true,  note: "CHECK: > 0" },
    ],
  },
  {
    name: "train",
    description: "Master train records with source/destination",
    color: "#f97316",
    columns: [
      { name: "train_no",              type: "INTEGER", pk: true,  fk: false, nullable: false, note: "PK" },
      { name: "train_name",            type: "TEXT",    pk: false, fk: false, nullable: true,  note: "" },
      { name: "train_type",            type: "TEXT",    pk: false, fk: false, nullable: true,  note: "Express/SF" },
      { name: "train_running_days",    type: "TEXT",    pk: false, fk: false, nullable: true,  note: "" },
      { name: "source_station_id",     type: "TEXT",    pk: false, fk: true,  nullable: true,  note: "→ station" },
      { name: "destination_station_id",type: "TEXT",    pk: false, fk: true,  nullable: true,  note: "→ station" },
      { name: "distance",              type: "INTEGER", pk: false, fk: false, nullable: true,  note: "km" },
    ],
  },
  {
    name: "train_route",
    description: "Via-station stops along a train route",
    color: "#ea580c",
    columns: [
      { name: "details_id",      type: "SERIAL",  pk: true,  fk: false, nullable: false, note: "Auto-increment PK" },
      { name: "train_code",      type: "INTEGER", pk: false, fk: true,  nullable: true,  note: "→ train" },
      { name: "via_station_code",type: "TEXT",    pk: false, fk: true,  nullable: true,  note: "→ station" },
      { name: "via_station_name",type: "TEXT",    pk: false, fk: false, nullable: true,  note: "" },
      { name: "km_from_origin",  type: "INTEGER", pk: false, fk: false, nullable: true,  note: "CHECK: ≥ 0" },
      { name: "reach_time",      type: "TIME",    pk: false, fk: false, nullable: true,  note: "" },
    ],
  },
  {
    name: "train_fare",
    description: "Fare per class with optional station pair",
    color: "#c2410c",
    columns: [
      { name: "fare_id",      type: "SERIAL",  pk: true,  fk: false, nullable: false, note: "Auto-increment PK" },
      { name: "class_id",     type: "INTEGER", pk: false, fk: true,  nullable: true,  note: "→ class" },
      { name: "from_station", type: "TEXT",    pk: false, fk: true,  nullable: true,  note: "→ station" },
      { name: "to_station",   type: "TEXT",    pk: false, fk: true,  nullable: true,  note: "→ station" },
      { name: "fare",         type: "NUMERIC", pk: false, fk: false, nullable: true,  note: "" },
    ],
  },
  {
    name: "seat_availability",
    description: "Available seats per train, per class, per journey date",
    color: "#9a3412",
    columns: [
      { name: "details_id",   type: "SERIAL",  pk: true,  fk: false, nullable: false, note: "Auto-increment PK" },
      { name: "train_code",   type: "INTEGER", pk: false, fk: true,  nullable: true,  note: "→ train" },
      { name: "journey_date", type: "DATE",    pk: false, fk: false, nullable: false, note: "" },
      { name: "sleeper",      type: "INTEGER", pk: false, fk: false, nullable: true,  note: "CHECK: ≥ 0" },
      { name: "3ac",          type: "INTEGER", pk: false, fk: false, nullable: true,  note: "CHECK: ≥ 0" },
      { name: "2ac",          type: "INTEGER", pk: false, fk: false, nullable: true,  note: "CHECK: ≥ 0" },
      { name: "1ac",          type: "INTEGER", pk: false, fk: false, nullable: true,  note: "CHECK: ≥ 0" },
    ],
  },
  {
    name: "ticket_reservation",
    description: "Booking header — one row per PNR",
    color: "#b45309",
    columns: [
      { name: "pnr_no",       type: "BIGINT",  pk: true,  fk: false, nullable: false, note: "PK" },
      { name: "user_id",      type: "INTEGER", pk: false, fk: true,  nullable: true,  note: "→ users" },
      { name: "train_id",     type: "INTEGER", pk: false, fk: true,  nullable: true,  note: "→ train" },
      { name: "from_station", type: "TEXT",    pk: false, fk: true,  nullable: true,  note: "→ station" },
      { name: "to_station",   type: "TEXT",    pk: false, fk: true,  nullable: true,  note: "→ station" },
      { name: "from_date",    type: "DATE",    pk: false, fk: false, nullable: true,  note: "CHECK: ≤ to_date" },
      { name: "to_date",      type: "DATE",    pk: false, fk: false, nullable: true,  note: "" },
      { name: "distance",     type: "INTEGER", pk: false, fk: false, nullable: true,  note: "CHECK: ≥ 0" },
      { name: "class_id",     type: "INTEGER", pk: false, fk: true,  nullable: false, note: "→ class" },
    ],
  },
  {
    name: "passenger",
    description: "Per-passenger detail rows for each booking",
    color: "#f97316",
    columns: [
      { name: "passenger_id", type: "SERIAL",  pk: true,  fk: false, nullable: false, note: "Auto-increment PK" },
      { name: "pnr_no",       type: "BIGINT",  pk: false, fk: true,  nullable: true,  note: "→ ticket_reservation" },
      { name: "pax_name",     type: "TEXT",    pk: false, fk: false, nullable: true,  note: "CHECK: alpha only, not empty" },
      { name: "pax_age",      type: "INTEGER", pk: false, fk: false, nullable: true,  note: "" },
      { name: "pax_sex",      type: "TEXT",    pk: false, fk: false, nullable: true,  note: "CHECK: M/F/O" },
      { name: "seat_no",      type: "TEXT",    pk: false, fk: false, nullable: true,  note: "" },
      { name: "fare",         type: "NUMERIC", pk: false, fk: false, nullable: true,  note: "CHECK: > 0" },
    ],
  },
  {
    name: "payment_info",
    description: "Payment record linked to a PNR and user",
    color: "#ea580c",
    columns: [
      { name: "transaction_number",  type: "TEXT",        pk: true,  fk: false, nullable: false, note: "PK" },
      { name: "pnr_no",              type: "BIGINT",      pk: false, fk: true,  nullable: true,  note: "→ ticket_reservation" },
      { name: "user_id",             type: "INTEGER",     pk: false, fk: true,  nullable: true,  note: "→ users" },
      { name: "payment_date",        type: "TIMESTAMPTZ", pk: false, fk: false, nullable: true,  note: "" },
      { name: "fare",                type: "NUMERIC",     pk: false, fk: false, nullable: false, note: "CHECK: > 0" },
      { name: "mode",                type: "TEXT",        pk: false, fk: false, nullable: false, note: "CHECK: UPI/Credit Card/Debit Card/Net Banking/Cash" },
      { name: "confirmation_status", type: "TEXT",        pk: false, fk: false, nullable: false, note: "CHECK: Pending/SUCCESS/FAILED/Confirmed/Cancelled" },
    ],
  },
  {
    name: "search_history",
    description: "Tracks user train search queries",
    color: "#9a3412",
    columns: [
      { name: "userid",         type: "INTEGER", pk: false, fk: true, nullable: false, note: "→ users" },
      { name: "from_stationid", type: "TEXT",    pk: false, fk: true, nullable: false, note: "→ station" },
      { name: "to_stationid",   type: "TEXT",    pk: false, fk: true, nullable: false, note: "→ station" },
    ],
  },
];

const FUNCTIONS = [
  // ── SELECT / QUERY ────────────────────────────────────────────────────────
  {
    name: "search_trains",
    type: "QUERY",
    description: "Returns trains between two stations for a given weekday",
    params: ["from_station_name TEXT", "to_station_name TEXT", "train_day TEXT"],
    returns: "TABLE (train_no, train_name, train_type, departure_time, arrival_time)",
  },
  {
    name: "get_train_schedule",
    type: "QUERY",
    description: "Returns full route schedule for a train",
    params: ["input_train_code INTEGER"],
    returns: "TABLE (stop_no, via_station_code, station_name, city, km_from_origin, reach_time, train_name)",
  },
  {
    name: "check_seat_availability",
    type: "QUERY",
    description: "Returns available seat count for a train, class, and journey date",
    params: ["input_train_code INTEGER", "input_journey_date DATE", "input_class_name TEXT"],
    returns: "TABLE (no_of_seats)",
  },
  {
    name: "fetch_from_stations",
    type: "QUERY",
    description: "Autocomplete — returns stations matching the input prefix",
    params: ["input_from TEXT"],
    returns: "TABLE (station_name, city)",
  },
  {
    name: "fetch_from_history",
    type: "QUERY",
    description: "Returns distinct origin stations from a user's search history",
    params: ["user_code INTEGER"],
    returns: "TABLE (station_name, city)",
  },
  {
    name: "fetch_to_history",
    type: "QUERY",
    description: "Returns distinct destination stations from a user's search history",
    params: ["user_code INTEGER"],
    returns: "TABLE (station_name, city)",
  },
  {
    name: "get_pnr_details",
    type: "QUERY",
    description: "Fetches full ticket + passenger + payment details for a PNR",
    params: ["pnr_number INTEGER"],
    returns: "TABLE (pnr_no, train_id, train_name, from_station, to_station, from_date, to_date, distance, pax_name, pax_age, pax_sex, seat_no, passenger_fare, transaction_number, payment_date, total_fare, mode, confirmation_status)",
  },
  {
    name: "fetch_user_reservations",
    type: "QUERY",
    description: "Returns all bookings for a user account",
    params: ["user_code INTEGER"],
    returns: "TABLE (pnr_no, train_name, from_station_name, to_station_name, booking_status)",
  },
  {
    name: "get_user_profile",
    type: "QUERY",
    description: "Retrieves profile details for a user",
    params: ["p_user_id INTEGER"],
    returns: "TABLE (user_id, name, email, phone, age, gender)",
  },
  {
    name: "check_email_exists",
    type: "QUERY",
    description: "Returns true if the email is already registered",
    params: ["p_email TEXT"],
    returns: "BOOLEAN",
  },
  {
    name: "login_user",
    type: "QUERY",
    description: "Validates credentials and returns user info if correct",
    params: ["p_email TEXT", "p_password TEXT"],
    returns: "TABLE (user_id, name, email)",
  },
  {
    name: "get_fare",
    type: "QUERY",
    description: "Returns the fare for a class by class code",
    params: ["input_class_code TEXT"],
    returns: "TABLE (fare)",
  },
  // ── DML ──────────────────────────────────────────────────────────────────
  {
    name: "register_user",
    type: "DML",
    description: "Creates a new user account after verifying email uniqueness",
    params: ["p_name TEXT", "p_phone TEXT", "p_age INTEGER", "p_gender TEXT", "p_email TEXT", "p_password TEXT"],
    returns: "VOID",
  },
  {
    name: "add_to_search_table",
    type: "DML",
    description: "Logs a new entry in search_history for a user",
    params: ["user_code INTEGER", "from_station_name TEXT", "to_station_name TEXT"],
    returns: "VOID",
  },
  {
    name: "update_user_profile",
    type: "DML",
    description: "Updates name, phone, age, and gender for a user",
    params: ["p_user_id INTEGER", "p_name TEXT", "p_phone TEXT", "p_age INTEGER", "p_gender TEXT"],
    returns: "VOID",
  },
  {
    name: "change_password",
    type: "DML",
    description: "Updates the password for a user account",
    params: ["p_user_id INTEGER", "p_new_password TEXT"],
    returns: "VOID",
  },
  {
    name: "reset_password",
    type: "DML",
    description: "Resets password via email lookup; returns true if email exists",
    params: ["p_email TEXT", "p_new_password TEXT"],
    returns: "BOOLEAN",
  },
  {
    name: "create_reservation",
    type: "DML",
    description: "Inserts a new ticket_reservation row and returns the generated PNR",
    params: ["user_code INTEGER", "input_train_code INTEGER", "input_class_name TEXT", "input_from_station_name TEXT", "input_to_station_name TEXT", "travel_from_date DATE", "travel_to_date DATE"],
    returns: "TABLE (pnr_no)",
  },
  {
    name: "add_passenger",
    type: "DML",
    description: "Adds a passenger row to an existing PNR",
    params: ["pnr_number BIGINT", "passenger_name TEXT", "passenger_age INTEGER", "passenger_sex TEXT", "allocated_seat TEXT", "ticket_fare NUMERIC"],
    returns: "TABLE (pnr_no, pax_name, pax_age, pax_sex, seat_no, fare)",
  },
  {
    name: "make_payment",
    type: "DML",
    description: "Inserts a payment record into payment_info and links it to the PNR",
    params: ["trans_no TEXT", "pnr_number BIGINT", "user_code INTEGER", "pay_date TIMESTAMPTZ", "amount NUMERIC", "pay_mode TEXT"],
    returns: "TABLE (pnr_no, transaction_number, confirmation_status)",
  },
  {
    name: "confirm_booking",
    type: "DML",
    description: "Sets confirmation_status to Confirmed for a PNR",
    params: ["pnr_number BIGINT"],
    returns: "VOID",
  },
  {
    name: "update_seat_availability",
    type: "DML",
    description: "Increments or decrements seat count for a class on a journey date",
    params: ["input_train_code INTEGER", "input_class_code TEXT", "input_journey_date DATE", "delta INTEGER (optional)"],
    returns: "VOID",
  },
  {
    name: "delete_user",
    type: "DML",
    description: "Permanently deletes a user account and all associated data",
    params: ["p_user_id INTEGER"],
    returns: "VOID",
  },
  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    name: "admin_create_train",
    type: "DML",
    description: "Inserts a fully specified new train record",
    params: ["input_train_no INTEGER", "input_train_name TEXT", "input_train_type TEXT", "input_train_running_days TEXT", "input_source_station_id TEXT", "input_destination_station_id TEXT", "input_distance INTEGER"],
    returns: "VOID",
  },
  {
    name: "admin_add_stop",
    type: "DML",
    description: "Adds a via-station stop to a train route",
    params: ["input_train_code INTEGER", "input_via_station_code TEXT", "input_km_from_origin INTEGER", "input_reach_time TIME"],
    returns: "VOID",
  },
  {
    name: "admin_add_seat_avail",
    type: "DML",
    description: "Sets seat counts for all classes for a train on a specific date",
    params: ["input_train_code INTEGER", "input_journey_date DATE", "input_sleeper INTEGER", "input_3ac INTEGER", "input_2ac INTEGER", "input_1ac INTEGER"],
    returns: "VOID",
  },
  {
    name: "admin_delete_train",
    type: "DML",
    description: "Deletes a train and all associated route, seat, and reservation data",
    params: ["input_train_no INTEGER"],
    returns: "VOID",
  },
];

// ─── CRUD log types ────────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  ts: string;
  op: "INSERT" | "UPDATE" | "SELECT" | "DELETE";
  table: string;
  sql: string;
}

const opColor: Record<string, string> = {
  INSERT: "text-green-400",
  UPDATE: "text-yellow-400",
  SELECT: "text-blue-400",
  DELETE: "text-red-400",
};

let _logId = 1;
function makeLog(op: LogEntry["op"], table: string, sql: string): LogEntry {
  return { id: _logId++, ts: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }), op, table, sql };
}

function formatSearchHistorySql(d: Record<string, unknown>) {
  const uid = d.userid ?? d.user_id ?? "?";
  const frm = d.from_stationid ?? d.from_station_code ?? d.from_station ?? "?";
  const too = d.to_stationid ?? d.to_station_code ?? d.to_station ?? "?";
  return `INSERT INTO search_history (userid, from_stationid, to_stationid) VALUES (${uid}, '${frm}', '${too}');`;
}

function formatUserSql(d: Record<string, unknown>) {
  return `INSERT INTO users (name, email, phone, age, gender) VALUES ('${d.name ?? '?'}', '${d.email ?? '?'}', '${d.phone ?? '?'}', ${d.age ?? 'NULL'}, '${d.gender ?? '?'}');`;
}

function formatReservationSql(op: "INSERT" | "UPDATE", d: Record<string, unknown>) {
  if (op === "INSERT")
    return `INSERT INTO ticket_reservation (pnr_no, train_no, user_id, class_code, journey_date) VALUES (${d.pnr_no ?? '?'}, ${d.train_no ?? '?'}, ${d.user_id ?? '?'}, '${d.class_code ?? '?'}', '${d.journey_date ?? '?'}');`;
  return `UPDATE ticket_reservation SET booking_status = '${d.booking_status ?? '?'}' WHERE pnr_no = ${d.pnr_no ?? '?'};`;
}

function formatPaymentSql(op: "INSERT" | "UPDATE", d: Record<string, unknown>) {
  if (op === "INSERT")
    return `INSERT INTO payment_info (pnr_no, user_id, amount, mode) VALUES (${d.pnr_no ?? '?'}, ${d.user_id ?? '?'}, ${d.amount ?? '?'}, '${d.mode ?? '?'}');`;
  return `UPDATE payment_info SET confirmation_status = '${d.confirmation_status ?? '?'}' WHERE pnr_no = ${d.pnr_no ?? '?'};`;
}

function formatTrainSql(op: "INSERT" | "DELETE", d: Record<string, unknown>) {
  if (op === "INSERT")
    return `INSERT INTO train (train_no, train_name, train_type, train_running_days) VALUES (${d.train_no ?? '?'}, '${d.train_name ?? '?'}', '${d.train_type ?? '?'}', '${d.train_running_days ?? '?'}');`;
  return `DELETE FROM train WHERE train_no = ${d.train_no ?? '?'};`;
}

// Determine SQL op type from RPC function name
function rpcOpType(fnName: string): LogEntry["op"] {
  if (/^(delete_|admin_delete)/.test(fnName)) return "DELETE";
  if (/^(register_|add_|create_|make_payment|admin_add_|admin_create_)/.test(fnName)) return "INSERT";
  if (/^(update_|confirm_|change_)/.test(fnName)) return "UPDATE";
  return "SELECT";
}

// Format any RPC call as a readable SQL string
function formatRpcSql(fnName: string, args: Record<string, unknown>): string {
  const params = Object.entries(args)
    .map(([k, v]) => {
      if (v === null || v === undefined) return `${k} => NULL`;
      if (typeof v === "string") return `${k} => '${v}'`;
      return `${k} => ${v}`;
    })
    .join(", ");
  return `SELECT public.${fnName}(${params});`;
}

// No seed logs — terminal shows only real-time DB events

// ─── Playground ────────────────────────────────────────────────────────────────

type ParamDef = { key: string; label: string; type: "text" | "number" | "date"; placeholder: string };
interface PlayFn { name: string; category: "SELECT" | "DML" | "Admin"; description: string; params: ParamDef[]; }

const PLAYGROUND_FUNCTIONS: PlayFn[] = [
  // ── SELECT ──────────────────────────────────────────────────────────────────
  { name: "search_trains", category: "SELECT", description: "Find trains between two stations on a given weekday",
    params: [
      { key: "from_station_name", label: "From Station", type: "text", placeholder: "Mumbai Central" },
      { key: "to_station_name",   label: "To Station",   type: "text", placeholder: "New Delhi" },
      { key: "train_day",         label: "Day",          type: "text", placeholder: "Mon" },
    ] },
  { name: "get_train_schedule", category: "SELECT", description: "Full route schedule for a train",
    params: [{ key: "input_train_code", label: "Train Number", type: "number", placeholder: "12301" }] },
  { name: "check_seat_availability", category: "SELECT", description: "Available seats for a class on a date",
    params: [
      { key: "input_train_code",  label: "Train Number",  type: "number", placeholder: "12301" },
      { key: "input_journey_date",label: "Journey Date",  type: "date",   placeholder: "" },
      { key: "input_class_name",  label: "Class Name",    type: "text",   placeholder: "Sleeper" },
    ] },
  { name: "fetch_from_stations", category: "SELECT", description: "Autocomplete station names",
    params: [{ key: "input_from", label: "Search Prefix", type: "text", placeholder: "Mum" }] },
  { name: "fetch_from_history", category: "SELECT", description: "Origin stations from a user's search history",
    params: [{ key: "user_code", label: "User ID", type: "number", placeholder: "1" }] },
  { name: "fetch_to_history", category: "SELECT", description: "Destination stations from a user's search history",
    params: [{ key: "user_code", label: "User ID", type: "number", placeholder: "1" }] },
  { name: "get_pnr_details", category: "SELECT", description: "Full ticket + passenger + payment details for a PNR",
    params: [{ key: "pnr_number", label: "PNR Number", type: "number", placeholder: "1234567890" }] },
  { name: "fetch_user_reservations", category: "SELECT", description: "All bookings for a user account",
    params: [{ key: "user_code", label: "User ID", type: "number", placeholder: "1" }] },
  { name: "get_user_profile", category: "SELECT", description: "Profile details for a user",
    params: [{ key: "p_user_id", label: "User ID", type: "number", placeholder: "1" }] },
  { name: "check_email_exists", category: "SELECT", description: "Returns true if email is already registered",
    params: [{ key: "p_email", label: "Email", type: "text", placeholder: "user@example.com" }] },
  { name: "login_user", category: "SELECT", description: "Validate credentials and return user info",
    params: [
      { key: "p_email",    label: "Email",    type: "text", placeholder: "user@example.com" },
      { key: "p_password", label: "Password", type: "text", placeholder: "password" },
    ] },
  { name: "get_fare", category: "SELECT", description: "Fare for a class code from train_fare table",
    params: [{ key: "input_class_code", label: "Class Code", type: "text", placeholder: "SL" }] },
  // ── DML ──────────────────────────────────────────────────────────────────────
  { name: "register_user", category: "DML", description: "Register a new passenger account",
    params: [
      { key: "p_name",     label: "Name",         type: "text",   placeholder: "John Doe" },
      { key: "p_phone",    label: "Phone",        type: "text",   placeholder: "9876543210" },
      { key: "p_age",      label: "Age",          type: "number", placeholder: "25" },
      { key: "p_gender",   label: "Gender (M/F/O)",type: "text",  placeholder: "M" },
      { key: "p_email",    label: "Email",        type: "text",   placeholder: "user@example.com" },
      { key: "p_password", label: "Password",     type: "text",   placeholder: "secret" },
    ] },
  { name: "add_to_search_table", category: "DML", description: "Log a train search for a user",
    params: [
      { key: "user_code",         label: "User ID",      type: "number", placeholder: "1" },
      { key: "from_station_name", label: "From Station",  type: "text",   placeholder: "Mumbai Central" },
      { key: "to_station_name",   label: "To Station",    type: "text",   placeholder: "New Delhi" },
    ] },
  { name: "update_user_profile", category: "DML", description: "Update name, phone, age, gender for a user",
    params: [
      { key: "p_user_id", label: "User ID",  type: "number", placeholder: "1" },
      { key: "p_name",    label: "Name",     type: "text",   placeholder: "John Doe" },
      { key: "p_phone",   label: "Phone",    type: "text",   placeholder: "9876543210" },
      { key: "p_age",     label: "Age",      type: "number", placeholder: "25" },
      { key: "p_gender",  label: "Gender",   type: "text",   placeholder: "M" },
    ] },
  { name: "change_password", category: "DML", description: "Update password for a user account",
    params: [
      { key: "p_user_id",     label: "User ID",      type: "number", placeholder: "1" },
      { key: "p_new_password",label: "New Password",  type: "text",   placeholder: "newpassword" },
    ] },
  { name: "reset_password", category: "DML", description: "Reset password via email; returns true if email found",
    params: [
      { key: "p_email",        label: "Email",        type: "text", placeholder: "user@example.com" },
      { key: "p_new_password", label: "New Password", type: "text", placeholder: "newpassword" },
    ] },
  { name: "create_reservation", category: "DML", description: "Create a new ticket reservation, returns PNR",
    params: [
      { key: "user_code",             label: "User ID",       type: "number", placeholder: "1" },
      { key: "input_train_code",      label: "Train Number",  type: "number", placeholder: "12301" },
      { key: "input_class_name",      label: "Class Name",    type: "text",   placeholder: "Sleeper" },
      { key: "input_from_station_name",label: "From Station", type: "text",   placeholder: "Mumbai Central" },
      { key: "input_to_station_name", label: "To Station",    type: "text",   placeholder: "New Delhi" },
      { key: "travel_from_date",      label: "Travel Date",   type: "date",   placeholder: "" },
      { key: "travel_to_date",        label: "Arrival Date",  type: "date",   placeholder: "" },
    ] },
  { name: "add_passenger", category: "DML", description: "Add a passenger row to an existing PNR",
    params: [
      { key: "pnr_number",     label: "PNR Number",    type: "number", placeholder: "1234567890" },
      { key: "passenger_name", label: "Name",          type: "text",   placeholder: "John Doe" },
      { key: "passenger_age",  label: "Age",           type: "number", placeholder: "25" },
      { key: "passenger_sex",  label: "Sex (M/F/O)",   type: "text",   placeholder: "M" },
      { key: "allocated_seat", label: "Seat No.",      type: "text",   placeholder: "S1-23" },
      { key: "ticket_fare",    label: "Fare (₹)",      type: "number", placeholder: "500" },
    ] },
  { name: "make_payment", category: "DML", description: "Record a payment for a PNR",
    params: [
      { key: "trans_no",    label: "Transaction No.",   type: "text",   placeholder: "TXN12345" },
      { key: "pnr_number",  label: "PNR Number",        type: "number", placeholder: "1234567890" },
      { key: "user_code",   label: "User ID",           type: "number", placeholder: "1" },
      { key: "pay_date",    label: "Payment Date",      type: "date",   placeholder: "" },
      { key: "amount",      label: "Amount (₹)",        type: "number", placeholder: "1500" },
      { key: "pay_mode",    label: "Mode (UPI/Card)",   type: "text",   placeholder: "UPI" },
    ] },
  { name: "confirm_booking", category: "DML", description: "Confirm a booking by PNR and update seats",
    params: [{ key: "pnr_number", label: "PNR Number", type: "number", placeholder: "1234567890" }] },
  { name: "update_seat_availability", category: "DML", description: "Increment/decrement seat count for a class",
    params: [
      { key: "input_train_code",  label: "Train Number",     type: "number", placeholder: "12301" },
      { key: "input_class_code",  label: "Class Code",       type: "text",   placeholder: "SL" },
      { key: "input_journey_date",label: "Journey Date",     type: "date",   placeholder: "" },
      { key: "delta",             label: "Delta (-1 = deduct)",type: "number",placeholder: "-1" },
    ] },
  { name: "delete_user", category: "DML", description: "Permanently delete a user account and all data",
    params: [{ key: "p_user_id", label: "User ID", type: "number", placeholder: "1" }] },
  // ── Admin ────────────────────────────────────────────────────────────────────
  { name: "admin_create_train", category: "Admin", description: "Add a new train record (all fields required)",
    params: [
      { key: "input_train_no",              label: "Train Number",       type: "number", placeholder: "12301" },
      { key: "input_train_name",            label: "Train Name",         type: "text",   placeholder: "Rajdhani Express" },
      { key: "input_train_type",            label: "Train Type",         type: "text",   placeholder: "Express" },
      { key: "input_train_running_days",    label: "Running Days",       type: "text",   placeholder: "Mon,Tue,Wed" },
      { key: "input_source_station_id",     label: "Source Station Code",type: "text",   placeholder: "MMCT" },
      { key: "input_destination_station_id",label: "Dest. Station Code", type: "text",   placeholder: "NDLS" },
      { key: "input_distance",              label: "Distance (km)",      type: "number", placeholder: "1400" },
    ] },
  { name: "admin_add_stop", category: "Admin", description: "Add a route stop for a train",
    params: [
      { key: "input_train_code",       label: "Train Number",    type: "number", placeholder: "12301" },
      { key: "input_via_station_code", label: "Station Code",    type: "text",   placeholder: "ST" },
      { key: "input_km_from_origin",   label: "KM From Origin",  type: "number", placeholder: "500" },
      { key: "input_reach_time",       label: "Reach Time HH:MM",type: "text",   placeholder: "14:30" },
    ] },
  { name: "admin_add_seat_avail", category: "Admin", description: "Set seat counts for a train on a date",
    params: [
      { key: "input_train_code",   label: "Train Number",  type: "number", placeholder: "12301" },
      { key: "input_journey_date", label: "Journey Date",  type: "date",   placeholder: "" },
      { key: "input_sleeper",      label: "Sleeper Seats", type: "number", placeholder: "500" },
      { key: "input_3ac",          label: "3AC Seats",     type: "number", placeholder: "200" },
      { key: "input_2ac",          label: "2AC Seats",     type: "number", placeholder: "100" },
      { key: "input_1ac",          label: "1AC Seats",     type: "number", placeholder: "50" },
    ] },
  { name: "admin_delete_train", category: "Admin", description: "Delete a train and all associated data permanently",
    params: [{ key: "input_train_no", label: "Train Number", type: "number", placeholder: "12301" }] },
];

// ─── Interactive ER Diagram ────────────────────────────────────────────────────

const ER_TABLE_COLOR: Record<string, string> = {
  zone: "#c2410c", users: "#f97316", train: "#ea580c", class: "#b45309",
  station: "#9a3412", train_route: "#c2410c", seat_availability: "#9a3412",
  train_fare: "#ea580c", search_history: "#b45309", ticket_reservation: "#f97316",
  passenger: "#c2410c", payment_info: "#9a3412",
};

const ER_RELATIONS = [
  { from: "zone",               to: "station",             label: "HAS" },
  { from: "station",            to: "train_route",         label: "APPEARS IN" },
  { from: "station",            to: "train",               label: "SRC/DEST" },
  { from: "train",              to: "train_route",         label: "HAS" },
  { from: "train",              to: "seat_availability",   label: "HAS" },
  { from: "class",              to: "train_fare",          label: "DETERMINES" },
  { from: "class",              to: "ticket_reservation",  label: "CLASSIFIES" },
  { from: "station",            to: "train_fare",          label: "FROM/TO" },
  { from: "users",              to: "ticket_reservation",  label: "BOOKS" },
  { from: "users",              to: "search_history",      label: "HAS" },
  { from: "users",              to: "payment_info",        label: "PAYS" },
  { from: "station",            to: "ticket_reservation",  label: "FROM/TO" },
  { from: "station",            to: "search_history",      label: "FROM/TO" },
  { from: "ticket_reservation", to: "passenger",           label: "CONTAINS" },
  { from: "ticket_reservation", to: "payment_info",        label: "HAS" },
  { from: "train",              to: "ticket_reservation",  label: "ON" },
];

const ER_INIT: Record<string, { x: number; y: number }> = {
  zone:               { x: 60,   y: 40   },
  station:            { x: 330,  y: 40   },
  train:              { x: 760,  y: 40   },
  class:              { x: 60,   y: 340  },
  train_route:        { x: 760,  y: 340  },
  seat_availability:  { x: 60,   y: 600  },
  train_fare:         { x: 500,  y: 340  },
  users:              { x: 60,   y: 900  },
  search_history:     { x: 60,   y: 1180 },
  passenger:          { x: 360,  y: 760  },
  ticket_reservation: { x: 640,  y: 760  },
  payment_info:       { x: 960,  y: 760  },
};

const ER_NODE_W = 210;
const ER_ROW_H  = 22;
const ER_HEAD_H = 38;
const ER_PAD    = 10;

function erNodeH(name: string) {
  const t = TABLES.find(t => t.name === name);
  return t ? ER_HEAD_H + t.columns.length * ER_ROW_H + ER_PAD : 60;
}

const ERDiagram = () => {
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(() => ({ ...ER_INIT }));
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(0.55);
  const [selected, setSelected] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<
    | { kind: "node"; id: string; ox: number; oy: number; mx0: number; my0: number }
    | { kind: "pan";  px0: number; py0: number; mx0: number; my0: number }
    | null
  >(null);

  const svgXY = (e: React.MouseEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onNodeDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { x, y } = svgXY(e);
    drag.current = { kind: "node", id, ox: pos[id].x, oy: pos[id].y, mx0: x, my0: y };
    setSelected(id);
  };

  const onBgDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const { x, y } = svgXY(e);
    drag.current = { kind: "pan", px0: pan.x, py0: pan.y, mx0: x, my0: y };
    setSelected(null);
  };

  const onMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    const { x, y } = svgXY(e);
    if (drag.current.kind === "node") {
      const { id, ox, oy, mx0, my0 } = drag.current;
      setPos(p => ({ ...p, [id]: { x: ox + (x - mx0) / zoom, y: oy + (y - my0) / zoom } }));
    } else {
      const { px0, py0, mx0, my0 } = drag.current;
      setPan({ x: px0 + (x - mx0), y: py0 + (y - my0) });
    }
  };

  const onUp = () => { drag.current = null; };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!e.ctrlKey) return; // only respond to pinch, not scroll
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const nz = Math.min(2.5, Math.max(0.2, zoom * factor));
    setPan(p => ({ x: x - (x - p.x) * (nz / zoom), y: y - (y - p.y) * (nz / zoom) }));
    setZoom(nz);
  };

  const edgePath = (from: string, to: string) => {
    const fp = pos[from]; const tp = pos[to];
    const fh = erNodeH(from); const th = erNodeH(to);
    const fcx = fp.x + ER_NODE_W / 2; const fcy = fp.y + fh / 2;
    const tcx = tp.x + ER_NODE_W / 2; const tcy = tp.y + th / 2;
    let sx: number, sy: number, ex: number, ey: number;
    if (Math.abs(tcx - fcx) >= Math.abs(tcy - fcy)) {
      sy = fcy; ey = tcy;
      if (tcx > fcx) { sx = fp.x + ER_NODE_W; ex = tp.x; }
      else            { sx = fp.x;             ex = tp.x + ER_NODE_W; }
    } else {
      sx = fcx; ex = tcx;
      if (tcy > fcy) { sy = fp.y + fh; ey = tp.y; }
      else            { sy = fp.y;     ey = tp.y + th; }
    }
    const dx = Math.abs(ex - sx) * 0.5;
    const dy = Math.abs(ey - sy) * 0.5;
    const cp = Math.min(dx, dy, 120);
    const c1x = sx + (ex > sx ? cp : -cp);
    const c2x = ex + (ex > sx ? -cp : cp);
    return { d: `M${sx},${sy} C${c1x},${sy} ${c2x},${ey} ${ex},${ey}`, mx: (sx + ex) / 2, my: (sy + ey) / 2 };
  };

  const reset = () => { setZoom(0.55); setPan({ x: 40, y: 40 }); setPos({ ...ER_INIT }); };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border bg-[#0c0a09]" style={{ height: 680 }}>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        {[
          { label: "+", action: () => setZoom(z => Math.min(z * 1.25, 2.5)) },
          { label: "−", action: () => setZoom(z => Math.max(z / 1.25, 0.2)) },
          { label: "⌂", action: reset },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action}
            className="h-8 w-8 rounded-lg bg-card/90 border border-border text-foreground flex items-center justify-center font-black text-sm hover:border-primary hover:text-primary transition-colors backdrop-blur-sm">
            {btn.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-4 text-[9px] font-mono bg-card/90 border border-border rounded-xl px-3 py-2 backdrop-blur-sm">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-400" /> PK</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-purple-400" /> FK</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-500" /> Col</span>
        <span className="text-muted-foreground hidden sm:inline">drag nodes · pinch to zoom · drag bg to pan</span>
      </div>

      <svg ref={svgRef} className="w-full h-full select-none"
        onMouseDown={onBgDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onWheel={onWheel}
        style={{ cursor: "grab" }}>
        <defs>
          <pattern id="er-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"
            patternTransform={`translate(${((pan.x % 40) + 40) % 40},${((pan.y % 40) + 40) % 40})`}>
            <circle cx="1" cy="1" r="1" fill="rgba(249,115,22,0.09)" />
          </pattern>
          <marker id="er-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L0,8 L8,4 z" fill="#f9731670" />
          </marker>
          <marker id="er-arr-sel" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L0,8 L8,4 z" fill="#f97316" />
          </marker>
          <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#f97316" floodOpacity="0.4" />
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#er-dots)" />

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges — render first so nodes sit on top */}
          {ER_RELATIONS.map(rel => {
            const { d, mx, my } = edgePath(rel.from, rel.to);
            const hi = selected === rel.from || selected === rel.to;
            return (
              <g key={`${rel.from}-${rel.to}`}>
                <path d={d} fill="none"
                  stroke={hi ? "#f97316" : "#f9731640"}
                  strokeWidth={hi ? 2 : 1.5}
                  strokeDasharray={hi ? undefined : "6,4"}
                  markerEnd={hi ? "url(#er-arr-sel)" : "url(#er-arr)"}
                />
                <rect x={mx - 17} y={my - 10} width={34} height={18} rx={5}
                  fill="#1c1917" stroke={hi ? "#f97316" : "#f9731450"} strokeWidth="1" />
                <text x={mx} y={my + 5} textAnchor="middle" fontSize="9"
                  fill={hi ? "#f97316" : "#f9731499"} fontFamily="monospace" fontWeight="bold">
                  {rel.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {TABLES.map(table => {
            const p = pos[table.name];
            const color = ER_TABLE_COLOR[table.name] ?? "#f97316";
            const h = erNodeH(table.name);
            const isSel = selected === table.name;
            return (
              <g key={table.name} transform={`translate(${p.x},${p.y})`}
                onMouseDown={e => onNodeDown(e, table.name)}
                style={{ cursor: "grab" }}
                filter={isSel ? "url(#node-glow)" : "url(#node-shadow)"}>

                {/* Body */}
                <rect width={ER_NODE_W} height={h} rx={10}
                  fill="#18120e" stroke={isSel ? color : color + "80"} strokeWidth={isSel ? 2 : 1.5} />

                {/* Header band */}
                <rect width={ER_NODE_W} height={ER_HEAD_H} rx={10} fill={color} />
                <rect y={ER_HEAD_H - 10} width={ER_NODE_W} height={10} fill={color} />

                {/* Table name */}
                <text x={ER_NODE_W / 2} y={ER_HEAD_H / 2 + 5} textAnchor="middle"
                  fontSize="11" fill="white" fontFamily="monospace" fontWeight="900"
                  style={{ pointerEvents: "none" }}>
                  {table.name}
                </text>

                {/* Column rows */}
                {table.columns.map((col, i) => {
                  const ry = ER_HEAD_H + ER_PAD / 2 + i * ER_ROW_H;
                  const isPk = col.pk; const isFk = col.fk;
                  const dotColor = isPk ? "#facc15" : isFk ? "#c084fc" : "#64748b";
                  const textColor = isPk ? "#fde68a" : isFk ? "#d8b4fe" : "#94a3b8";
                  return (
                    <g key={col.name} transform={`translate(0,${ry})`} style={{ pointerEvents: "none" }}>
                      {/* Subtle row separator */}
                      {i > 0 && <line x1={10} y1={0} x2={ER_NODE_W - 10} y2={0} stroke="#ffffff08" strokeWidth="1" />}
                      {/* Badge dot */}
                      <circle cx={18} cy={ER_ROW_H / 2} r={3.5} fill={dotColor} />
                      {/* Column name */}
                      <text x={28} y={ER_ROW_H / 2 + 4} fontSize="9.5" fill={textColor}
                        fontFamily="monospace" fontWeight={isPk ? "bold" : "normal"}>
                        {col.name}
                      </text>
                      {/* Type badge (right aligned) */}
                      <text x={ER_NODE_W - 10} y={ER_ROW_H / 2 + 4} textAnchor="end"
                        fontSize="8" fill="#475569" fontFamily="monospace">
                        {col.type}{col.pk ? " PK" : col.fk ? " FK" : ""}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = "overview" | "tables" | "functions" | "er" | "playground";

const Database = () => {
  const [tab, setTab] = useState<Tab>("overview");
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableSubTab, setTableSubTab] = useState<Record<string, "schema" | "data">>({});
  const [tableData, setTableData] = useState<Record<string, Record<string, unknown>[]>>({});
  const [tableDataLoading, setTableDataLoading] = useState<string | null>(null);
  const [tableDataError, setTableDataError] = useState<Record<string, string>>({});
  const [expandedFn, setExpandedFn] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [termOpen, setTermOpen] = useState(true);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const termRef = useRef<HTMLDivElement>(null);
  const lastRpcTsRef = useRef<number>(0);

  // Playground state
  const [playFn, setPlayFn] = useState<PlayFn>(PLAYGROUND_FUNCTIONS[0]);
  const [playInputs, setPlayInputs] = useState<Record<string, string>>({});
  const [playResult, setPlayResult] = useState<unknown>(null);
  const [playLoading, setPlayLoading] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [playSearch, setPlaySearch] = useState("");

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  // Supabase realtime: listen for all relevant table changes
  useEffect(() => {
    const channel = supabase
      .channel("db-monitor")
      // search_history
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "search_history" }, (payload) => {
        const d = payload.new as Record<string, unknown>;
        setLogs(p => [...p.slice(-199), makeLog("INSERT", "search_history", formatSearchHistorySql(d))]);
      })
      // users
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "users" }, (payload) => {
        setLogs(p => [...p.slice(-199), makeLog("INSERT", "users", formatUserSql(payload.new as Record<string, unknown>))]);
      })
      // ticket_reservation INSERT
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_reservation" }, (payload) => {
        setLogs(p => [...p.slice(-199), makeLog("INSERT", "ticket_reservation", formatReservationSql("INSERT", payload.new as Record<string, unknown>))]);
      })
      // ticket_reservation UPDATE (booking_status change)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ticket_reservation" }, (payload) => {
        setLogs(p => [...p.slice(-199), makeLog("UPDATE", "ticket_reservation", formatReservationSql("UPDATE", payload.new as Record<string, unknown>))]);
      })
      // payment_info INSERT
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payment_info" }, (payload) => {
        setLogs(p => [...p.slice(-199), makeLog("INSERT", "payment_info", formatPaymentSql("INSERT", payload.new as Record<string, unknown>))]);
      })
      // payment_info UPDATE (confirmation)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payment_info" }, (payload) => {
        setLogs(p => [...p.slice(-199), makeLog("UPDATE", "payment_info", formatPaymentSql("UPDATE", payload.new as Record<string, unknown>))]);
      })
      // train INSERT (admin adds)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "train" }, (payload) => {
        setLogs(p => [...p.slice(-199), makeLog("INSERT", "train", formatTrainSql("INSERT", payload.new as Record<string, unknown>))]);
      })
      // train DELETE (admin removes)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "train" }, (payload) => {
        setLogs(p => [...p.slice(-199), makeLog("DELETE", "train", formatTrainSql("DELETE", payload.old as Record<string, unknown>))]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // SessionStorage polling: picks up RPC calls made on ANY page (cross-page logging)
  useEffect(() => {
    const tick = () => {
      try {
        const raw = sessionStorage.getItem("nexrail_rpc_log");
        if (!raw) return;
        const entries: { fnName: string; args: Record<string, unknown>; ts: number }[] = JSON.parse(raw);
        const newEntries = entries.filter(e => e.ts > lastRpcTsRef.current);
        if (newEntries.length === 0) return;
        lastRpcTsRef.current = Math.max(...newEntries.map(e => e.ts));
        setLogs(p => [
          ...p.slice(-199),
          ...newEntries.map(e => makeLog(rpcOpType(e.fnName), e.fnName, formatRpcSql(e.fnName, e.args))),
        ]);
      } catch { /* ignore parse errors */ }
    };
    tick(); // immediate first read
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, []);

  // Fetch rough row counts via RPCs we already have
  useEffect(() => {
    const fetchCounts = async () => {
      const results: Record<string, number> = {};
      const tableNames = ["users", "zone", "station", "class", "train", "train_route", "train_fare", "seat_availability", "ticket_reservation", "passenger", "payment_info", "search_history"];
      await Promise.all(tableNames.map(async (name) => {
        const { count } = await supabase.from(name as never).select("*", { count: "exact", head: true });
        if (count !== null) results[name] = count;
      }));
      setTableCounts(results);
    };
    fetchCounts().catch(() => {});
  }, []);

  const handleExpandTable = async (name: string, force = false) => {
    if (!force && expandedTable === name) { setExpandedTable(null); return; }
    setExpandedTable(name);
    if (!force && (tableData[name] !== undefined || tableDataError[name])) return;
    setTableDataLoading(name);
    setTableDataError(prev => { const n = { ...prev }; delete n[name]; return n; });
    const { data, error } = await supabase.from(name as never).select("*").limit(200);
    if (error) {
      setTableDataError(prev => ({ ...prev, [name]: error.message }));
    } else {
      setTableData(prev => ({ ...prev, [name]: (data as Record<string, unknown>[]) || [] }));
    }
    setTableDataLoading(null);
  };

  const switchSubTab = async (tableName: string, st: "schema" | "data") => {
    setTableSubTab(p => ({ ...p, [tableName]: st }));
    if (st === "data" && tableData[tableName] === undefined && !tableDataError[tableName]) {
      setTableDataLoading(tableName);
      const { data, error } = await supabase.from(tableName as never).select("*").limit(200);
      if (error) setTableDataError(prev => ({ ...prev, [tableName]: error.message }));
      else setTableData(prev => ({ ...prev, [tableName]: (data as Record<string, unknown>[]) || [] }));
      setTableDataLoading(null);
    }
  };

  const handlePlay = async () => {
    setPlayLoading(true);
    setPlayResult(null);
    setPlayError(null);
    const args: Record<string, unknown> = {};
    for (const p of playFn.params) {
      const raw = playInputs[p.key] ?? "";
      if (raw === "") { args[p.key] = null; continue; }
      args[p.key] = p.type === "number" ? Number(raw) : raw;
    }
    const { data, error } = await supabase.rpc(playFn.name as never, args);
    setPlayLoading(false);
    if (error) { setPlayError(error.message); return; }
    setPlayResult(data);
  };

  const selectPlayFn = (fn: PlayFn) => {
    setPlayFn(fn);
    setPlayInputs({});
    setPlayResult(null);
    setPlayError(null);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",    label: "Overview",    icon: DbIcon },
    { id: "tables",      label: "Tables",      icon: Table2 },
    { id: "functions",   label: "Functions",   icon: FunctionSquare },
    { id: "er",          label: "ER Diagram",  icon: GitFork },
    { id: "playground",  label: "Playground",  icon: Play },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Dot-grid background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.07) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-[radial-gradient(ellipse,rgba(249,115,22,0.06),transparent_65%)]" />
      </div>

      <main className="container mx-auto px-4 pt-28 pb-16 relative z-10 space-y-6">

        {/* Page header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">
              <Circle className="h-2 w-2 fill-orange-500 animate-pulse" /> LIVE DATABASE MONITOR
            </span>
          </div>
          <h1 className="font-mono font-black text-4xl md:text-5xl leading-tight">
            DATABASE<br /><span className="text-primary">EXPLORER</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-xl">
            Full schema, stored procedures, ER diagram, and real-time CRUD activity for the NEXRAIL DBMS project.
          </p>
        </motion.div>

        {/* ── CRUD Terminal ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            {/* Terminal titlebar */}
            <div
              className="bg-slate-900 px-5 py-3 flex items-center justify-between cursor-pointer select-none"
              onClick={() => setTermOpen(o => !o)}
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <Terminal className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300 text-xs font-mono font-bold">nexrail-db — live DB activity monitor</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-400">
                  <Circle className="h-1.5 w-1.5 fill-green-400 animate-pulse" /> connected
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${termOpen ? "" : "-rotate-90"}`} />
            </div>

            <AnimatePresence initial={false}>
              {termOpen && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: 240 }} exit={{ height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div
                    ref={termRef}
                    className="h-60 overflow-y-auto bg-slate-950 px-5 py-4 font-mono text-xs space-y-1"
                  >
                    {logs.length === 0 && (
                      <div className="text-slate-600 italic pt-1">-- waiting for search events (search trains on home page to see rows here)</div>
                    )}
                    {logs.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 leading-relaxed">
                        <span className="text-slate-600 shrink-0">{entry.ts}</span>
                        <span className={`shrink-0 font-black w-14 ${opColor[entry.op]}`}>{entry.op}</span>
                        <span className="text-orange-400 shrink-0">{entry.table}</span>
                        <span className="text-slate-300 break-all">{entry.sql}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-slate-600 pt-1">
                      <span className="text-primary">›</span>
                      <span className="animate-pulse">_</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Tab bar ────────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <div className="flex gap-2 flex-wrap">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                  tab === id
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── Overview ─────────────────────────────────────────────────────── */}
          {tab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Tables",        val: TABLES.length.toString() },
                  { label: "Stored Procs",  val: FUNCTIONS.length.toString() },
                  { label: "Relationships", val: ER_RELATIONS.length.toString() },
                  { label: "Total Rows",    val: Object.keys(tableCounts).length === 0 ? "…" : Object.values(tableCounts).reduce((a, b) => a + b, 0).toLocaleString() },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-card border rounded-2xl p-6 shadow-sm">
                    <p className="text-muted-foreground text-xs uppercase font-black tracking-widest">{label}</p>
                    <p className="text-4xl font-black mt-2 font-mono text-primary">{val}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {TABLES.map(t => (
                  <div key={t.name} className="bg-card border rounded-2xl p-5 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.color + "22", border: `1px solid ${t.color}44` }}>
                      <Table2 className="h-5 w-5" style={{ color: t.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-mono font-black text-sm">{t.name}</p>
                        {tableCounts[t.name] !== undefined && (
                          <span className="text-[10px] font-bold text-muted-foreground border rounded-full px-2 py-0.5">
                            {tableCounts[t.name].toLocaleString()} rows
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      <p className="text-[10px] text-primary font-bold mt-2 uppercase tracking-widest">{t.columns.length} columns · {t.columns.filter(c => c.pk).length} PK · {t.columns.filter(c => c.fk).length} FK</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Tables ───────────────────────────────────────────────────────── */}
          {tab === "tables" && (
            <motion.div key="tables" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {TABLES.map(t => {
                const open = expandedTable === t.name;
                const subTab = tableSubTab[t.name] || "schema";
                const rows = tableData[t.name] || [];
                const fetchError = tableDataError[t.name];
                const cols = rows.length > 0 ? Object.keys(rows[0]) : t.columns.map(c => c.name);
                return (
                  <div key={t.name} className="border rounded-2xl overflow-hidden bg-card">
                    <button
                      onClick={() => handleExpandTable(t.name)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/40 transition-colors text-left"
                    >
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.color + "22" }}>
                        <Table2 className="h-4 w-4" style={{ color: t.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-mono font-black text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {tableCounts[t.name] !== undefined && (
                          <span className="text-xs font-bold text-muted-foreground hidden sm:block">{tableCounts[t.name].toLocaleString()} rows</span>
                        )}
                        <span className="text-xs text-muted-foreground">{t.columns.length} cols</span>
                        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {open && (
                      <div className="border-t">
                        {/* DDL bar + sub-tabs */}
                        <div className="bg-slate-950 px-6 py-3 font-mono text-[11px] text-slate-400 border-b border-slate-800 flex items-center justify-between gap-4">
                          <span>
                            <span className="text-purple-400">SELECT</span>{" "}
                            <span className="text-yellow-300">*</span>{" "}
                            <span className="text-purple-400">FROM</span>{" "}
                            <span className="text-orange-400">{t.name}</span>
                            <span className="text-slate-500"> LIMIT 200;</span>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {(["schema", "data"] as const).map(st => (
                              <button
                                key={st}
                                onClick={() => switchSubTab(t.name, st)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                  subTab === st ? "bg-primary text-white" : "text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Schema view */}
                        {subTab === "schema" && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="border-b bg-muted/30">
                                  <th className="px-6 py-3 font-black text-muted-foreground uppercase tracking-widest">Column</th>
                                  <th className="px-4 py-3 font-black text-muted-foreground uppercase tracking-widest">Type</th>
                                  <th className="px-4 py-3 font-black text-muted-foreground uppercase tracking-widest">PK</th>
                                  <th className="px-4 py-3 font-black text-muted-foreground uppercase tracking-widest">FK</th>
                                  <th className="px-4 py-3 font-black text-muted-foreground uppercase tracking-widest">Nullable</th>
                                  <th className="px-4 py-3 font-black text-muted-foreground uppercase tracking-widest">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {t.columns.map((col, i) => (
                                  <tr key={col.name} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                                    <td className="px-6 py-3 font-mono font-bold text-foreground">{col.name}</td>
                                    <td className="px-4 py-3 font-mono text-blue-500">{col.type}</td>
                                    <td className="px-4 py-3">{col.pk ? <span className="text-yellow-500 font-black">●</span> : <span className="text-muted-foreground/30">–</span>}</td>
                                    <td className="px-4 py-3">{col.fk ? <span className="text-purple-400 font-black">●</span> : <span className="text-muted-foreground/30">–</span>}</td>
                                    <td className="px-4 py-3">{col.nullable ? <span className="text-slate-400">YES</span> : <span className="text-red-400 font-bold">NO</span>}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{col.note}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Data view */}
                        {subTab === "data" && (
                          <div>
                            {tableDataLoading === t.name ? (
                              <div className="flex items-center justify-center py-10 gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Fetching rows…
                              </div>
                            ) : fetchError ? (
                              <div className="p-6 space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                  <span className="text-red-400 text-lg shrink-0">⚠</span>
                                  <div className="text-sm">
                                    <p className="font-bold text-red-400 mb-1">RLS Policy blocked this query</p>
                                    <p className="text-muted-foreground font-mono text-xs break-all">{fetchError}</p>
                                  </div>
                                </div>
                                <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs space-y-1">
                                  <p className="text-slate-400 mb-2 uppercase text-[10px] font-black tracking-widest">Fix — run in SQL Editor:</p>
                                  <p><span className="text-purple-400">ALTER TABLE</span> <span className="text-orange-400">{t.name}</span> <span className="text-purple-400">DISABLE ROW LEVEL SECURITY</span>;</p>
                                  <p className="text-slate-600">-- or add a public read policy:</p>
                                  <p><span className="text-purple-400">CREATE POLICY</span> <span className="text-yellow-300">"public_read"</span> <span className="text-purple-400">ON</span> <span className="text-orange-400">{t.name}</span></p>
                                  <p className="pl-4"><span className="text-purple-400">FOR SELECT USING</span> <span className="text-slate-300">(true)</span>;</p>
                                </div>
                                <button
                                  onClick={() => handleExpandTable(t.name, true)}
                                  className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                                >
                                  Retry
                                </button>
                              </div>
                            ) : rows.length === 0 ? (
                              <div className="text-center py-10 text-sm text-muted-foreground">No rows found</div>
                            ) : (
                              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                                    <tr className="border-b">
                                      {cols.map(col => (
                                        <th key={col} className="px-4 py-3 font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{col}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map((row, i) => (
                                      <tr key={i} className={`border-b last:border-0 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                                        {cols.map(col => {
                                          const val = row[col];
                                          const isPk = t.columns.find(c => c.name === col)?.pk;
                                          return (
                                            <td key={col} className={`px-4 py-2.5 font-mono whitespace-nowrap max-w-[200px] truncate ${isPk ? "text-yellow-500 font-black" : "text-foreground"}`}>
                                              {val === null || val === undefined
                                                ? <span className="text-muted-foreground/40 italic">null</span>
                                                : String(val)}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <div className="px-4 py-2 border-t text-[10px] text-muted-foreground font-mono">
                                  {rows.length} row{rows.length !== 1 ? "s" : ""} fetched{rows.length === 200 ? " (limit 200)" : ""}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ── Functions ─────────────────────────────────────────────────────── */}
          {tab === "functions" && (
            <motion.div key="functions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {FUNCTIONS.map(fn => {
                const open = expandedFn === fn.name;
                const isDml = fn.type === "DML";
                return (
                  <div key={fn.name} className="border rounded-2xl overflow-hidden bg-card">
                    <button
                      onClick={() => setExpandedFn(open ? null : fn.name)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/40 transition-colors text-left"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isDml ? "bg-orange-500/10" : "bg-blue-500/10"}`}>
                        <FunctionSquare className={`h-4 w-4 ${isDml ? "text-orange-500" : "text-blue-500"}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono font-black text-sm">{fn.name}()</p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isDml ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500"}`}>{fn.type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{fn.description}</p>
                      </div>
                      {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </button>

                    {open && (
                      <div className="border-t bg-slate-950 px-6 py-5 font-mono text-xs space-y-3">
                        <div>
                          <p className="text-slate-500 uppercase text-[10px] font-black tracking-widest mb-1">Parameters</p>
                          <div className="space-y-1">
                            {fn.params.map(p => (
                              <div key={p} className="flex gap-2">
                                <span className="text-slate-600">·</span>
                                <span className="text-yellow-300">{p.split(" ")[0]}</span>
                                <span className="text-blue-400">{p.split(" ").slice(1).join(" ")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-500 uppercase text-[10px] font-black tracking-widest mb-1">Returns</p>
                          <span className="text-green-400">{fn.returns}</span>
                        </div>
                        <div className="pt-2">
                          <p className="text-slate-500 uppercase text-[10px] font-black tracking-widest mb-1">Signature</p>
                          <p className="text-slate-300">
                            <span className="text-purple-400">CREATE OR REPLACE FUNCTION</span>{" "}
                            <span className="text-orange-400">{fn.name}</span>
                            <span className="text-slate-500">({fn.params.join(", ")})</span>
                            {" "}<span className="text-purple-400">RETURNS</span>{" "}
                            <span className="text-green-400">{fn.returns.includes("TABLE") ? "TABLE(...)" : fn.returns}</span>
                            {" "}<span className="text-purple-400">LANGUAGE</span>{" "}
                            <span className="text-yellow-300">plpgsql</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ── Playground ───────────────────────────────────────────────────── */}
          {tab === "playground" && (() => {
            const catColor: Record<string, string> = { SELECT: "text-blue-400 bg-blue-500/10", DML: "text-orange-400 bg-orange-500/10", Admin: "text-red-400 bg-red-500/10" };
            const filtered = PLAYGROUND_FUNCTIONS.filter(f =>
              playSearch === "" || f.name.toLowerCase().includes(playSearch.toLowerCase()) || f.description.toLowerCase().includes(playSearch.toLowerCase())
            );
            const groups = ["SELECT", "DML", "Admin"] as const;
            const resultRows: Record<string, unknown>[] = Array.isArray(playResult) ? playResult as Record<string, unknown>[] : playResult !== null ? [{ result: JSON.stringify(playResult) }] : [];
            const resultCols = resultRows.length > 0 ? Object.keys(resultRows[0]) : [];
            return (
              <motion.div key="playground" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="grid lg:grid-cols-[280px_1fr] gap-4">

                {/* Left: function list */}
                <div className="bg-card border rounded-2xl overflow-hidden flex flex-col">
                  <div className="p-3 border-b">
                    <input value={playSearch} onChange={e => setPlaySearch(e.target.value)}
                      placeholder="Search functions…"
                      className="w-full bg-secondary rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div className="overflow-y-auto flex-1" style={{ maxHeight: 620 }}>
                    {groups.map(cat => {
                      const fns = filtered.filter(f => f.category === cat);
                      if (fns.length === 0) return null;
                      return (
                        <div key={cat}>
                          <div className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border-b ${catColor[cat]}`}>{cat}</div>
                          {fns.map(fn => (
                            <button key={fn.name} onClick={() => selectPlayFn(fn)}
                              className={`w-full text-left px-4 py-2.5 border-b last:border-0 transition-colors hover:bg-secondary/60 ${
                                playFn.name === fn.name ? "bg-primary/10 border-l-2 border-l-primary" : ""
                              }`}>
                              <p className="font-mono text-xs font-bold truncate">{fn.name}()</p>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{fn.description}</p>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: form + result */}
                <div className="space-y-4">

                  {/* Function header */}
                  <div className="bg-card border rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-base">{playFn.name}()</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${catColor[playFn.category]}`}>{playFn.category}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{playFn.description}</p>
                      </div>
                      <button onClick={handlePlay} disabled={playLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-mono text-xs font-black tracking-widest hover:bg-primary/90 transition-all disabled:opacity-60 shrink-0">
                        {playLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        {playLoading ? "Running…" : "Run"}
                      </button>
                    </div>

                    {/* SQL preview */}
                    <div className="bg-slate-950 rounded-xl px-4 py-3 font-mono text-xs text-slate-400 mb-4">
                      <span className="text-purple-400">SELECT</span> public.<span className="text-orange-400">{playFn.name}</span>(
                      {playFn.params.map((p, i) => {
                        const v = playInputs[p.key] ?? "?";
                        return <span key={p.key}>{i > 0 ? ", " : ""}<span className="text-yellow-300">{p.type === "text" ? `'${v}'` : v}</span></span>;
                      })});
                    </div>

                    {/* Inputs grid */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {playFn.params.map(p => (
                        <div key={p.key}>
                          <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">{p.label}</label>
                          <input
                            type={p.type === "number" ? "number" : p.type === "date" ? "date" : "text"}
                            value={playInputs[p.key] ?? ""}
                            onChange={e => setPlayInputs(prev => ({ ...prev, [p.key]: e.target.value }))}
                            placeholder={p.placeholder}
                            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Result panel */}
                  <div className="bg-card border rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b flex items-center gap-2 bg-slate-950">
                      <Terminal className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-mono font-bold text-slate-300">Result</span>
                      {playResult !== null && !playError && (
                        <span className="ml-auto text-[10px] font-mono text-green-400">
                          {Array.isArray(playResult) ? `${(playResult as unknown[]).length} row(s)` : "OK"}
                        </span>
                      )}
                    </div>
                    <div className="min-h-[120px]">
                      {!playResult && !playError && !playLoading && (
                        <div className="flex items-center justify-center h-28 text-xs text-muted-foreground font-mono">Fill in the params and press Run</div>
                      )}
                      {playLoading && (
                        <div className="flex items-center justify-center h-28 gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Executing…
                        </div>
                      )}
                      {playError && (
                        <div className="flex items-start gap-3 p-5">
                          <TriangleAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-xs font-mono text-red-400 break-all">{playError}</p>
                        </div>
                      )}
                      {playResult !== null && !playError && resultRows.length === 0 && (
                        <div className="flex items-center justify-center h-28 text-xs text-muted-foreground font-mono">No rows returned / VOID</div>
                      )}
                      {resultRows.length > 0 && (
                        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
                              <tr className="border-b">
                                {resultCols.map(col => (
                                  <th key={col} className="px-4 py-2.5 font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {resultRows.map((row, i) => (
                                <tr key={i} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                                  {resultCols.map(col => (
                                    <td key={col} className="px-4 py-2 font-mono whitespace-nowrap max-w-[220px] truncate">
                                      {row[col] === null || row[col] === undefined
                                        ? <span className="text-muted-foreground/40 italic">null</span>
                                        : String(row[col])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* ── ER Diagram ───────────────────────────────────────────────────── */}
          {tab === "er" && (
            <motion.div key="er" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="bg-card border rounded-3xl overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center gap-3">
                  <GitFork className="h-5 w-5 text-primary" />
                  <h3 className="font-mono font-black">ENTITY-RELATIONSHIP DIAGRAM</h3>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">{TABLES.length} tables · {ER_RELATIONS.length} relations</span>
                </div>
                <div className="p-3">
                  <ERDiagram />
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

export default Database;
