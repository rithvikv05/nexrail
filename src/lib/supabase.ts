import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://twezdxkwpuioapgzqppy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZXpkeGt3cHVpb2FwZ3pxcHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDkzOTAsImV4cCI6MjA4NTc4NTM5MH0.gRcAXhoe7qxmwc5KUfG8cmeY2dbujc5as0_P15SdNPk";

const _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Proxy rpc so every function call is persisted for the DB terminal (cross-page)
const _rpc = _client.rpc.bind(_client);
(_client as unknown as Record<string, unknown>).rpc = (fnName: string, args?: Record<string, unknown>, opts?: Record<string, unknown>) => {
  if (typeof window !== "undefined") {
    try {
      const existing: { fnName: string; args: Record<string, unknown>; ts: number }[] =
        JSON.parse(sessionStorage.getItem("nexrail_rpc_log") || "[]");
      existing.push({ fnName, args: args ?? {}, ts: Date.now() });
      sessionStorage.setItem("nexrail_rpc_log", JSON.stringify(existing.slice(-300)));
    } catch { /* ignore quota errors */ }
  }
  return _rpc(fnName as never, args, opts);
};

export const supabase = _client;
