import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRightLeft, Calendar, Search, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Station { station_name: string; city: string; }
interface HistoryItem { station_name: string; }
interface TrainResult {
  train_no: string;
  train_name: string;
  train_type: string;
  departure_time: string;
  arrival_time: string;
}
interface SearchMeta { from: string; to: string; date: string; }

const HeroSearch = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState<Station[]>([]);
  const [toSuggestions, setToSuggestions] = useState<Station[]>([]);
  const [fromHistory, setFromHistory] = useState<HistoryItem[]>([]);
  const [toHistory, setToHistory] = useState<HistoryItem[]>([]);
  const [showFromDrop, setShowFromDrop] = useState(false);
  const [showToDrop, setShowToDrop] = useState(false);
  const [searching, setSearching] = useState(false);
  const fromTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Track viewport width so train animation uses plain px (calc() breaks Framer interpolation)
  const [vw, setVw] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1440);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) setShowFromDrop(false);
      if (toRef.current && !toRef.current.contains(e.target as Node)) setShowToDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchHistory = useCallback(async (type: "from" | "to") => {
    if (!user) return;
    try {
      const key = type === "from" ? "from_stationid" : "to_stationid";
      const { data: historyRows, error: histErr } = await supabase
        .from("search_history")
        .select("userid, from_stationid, to_stationid")
        .eq("userid", user.user_id)
        .limit(50);
      if (histErr || !historyRows) {
        if (type === "from") setFromHistory([]);
        else setToHistory([]);
        return;
      }

      const recentCodes = Array.from(new Set(
        historyRows
          .map((row) => String((row as Record<string, unknown>)[key] ?? "").trim())
          .filter(Boolean)
          .reverse()
      )).slice(0, 10);

      if (recentCodes.length === 0) {
        if (type === "from") setFromHistory([]);
        else setToHistory([]);
        return;
      }

      const { data: stations } = await supabase
        .from("station")
        .select("station_code, station_name")
        .in("station_code", recentCodes);

      const nameByCode = new Map<string, string>();
      (stations || []).forEach((st) => {
        const rec = st as Record<string, unknown>;
        const code = String(rec.station_code ?? "");
        const name = String(rec.station_name ?? code);
        if (code) nameByCode.set(code, name);
      });

      const normalized: HistoryItem[] = recentCodes.map((code) => ({ station_name: nameByCode.get(code) || code }));
      if (type === "from") setFromHistory(normalized);
      else setToHistory(normalized);
    } catch { /* history is optional */ }
  }, [user]);

  // Fetch history once on mount when logged in
  useEffect(() => {
    if (user) {
      fetchHistory("from");
      fetchHistory("to");
    }
  }, [user, fetchHistory]);

  const handleFromChange = (val: string) => {
    setFrom(val);
    if (fromTimer.current) clearTimeout(fromTimer.current);
    if (val.length < 2) {
      setFromSuggestions([]);
      return;
    }
    fromTimer.current = setTimeout(async () => {
      const { data } = await supabase.rpc("fetch_from_stations", { input_from: val });
      setFromSuggestions(data || []);
    }, 300);
  };

  const handleToChange = (val: string) => {
    setTo(val);
    if (toTimer.current) clearTimeout(toTimer.current);
    if (val.length < 2) {
      setToSuggestions([]);
      return;
    }
    toTimer.current = setTimeout(async () => {
      const { data } = await supabase.rpc("fetch_from_stations", { input_from: val });
      setToSuggestions(data || []);
    }, 300);
  };

  const swapStations = () => { setFrom(to); setTo(from); };

  const handleSearch = async () => {
    if (!from || !to || !date) return;
    setSearching(true);
    setShowFromDrop(false);
    setShowToDrop(false);
    const trainDay = DAYS[new Date(date).getDay()];
    // Save history BEFORE navigating so Realtime fires while we're still on the page
    if (user) {
      try {
        await supabase.rpc("add_to_search_table", {
          user_code: user.user_id,
          from_station_name: from,
          to_station_name: to,
        });
        fetchHistory("from");
        fetchHistory("to");
      } catch { /* non-critical */ }
    }
    const { data, error } = await supabase.rpc("search_trains", {
      from_station_name: from,
      to_station_name: to,
      train_day: trainDay,
    });
    setSearching(false);
    const seen = new Set<string>();
    const results: TrainResult[] = (data || [])
      .map((r: TrainResult) => ({ ...r, train_no: String(r.train_no) }))
      .filter((r: TrainResult) => { if (seen.has(r.train_no)) return false; seen.add(r.train_no); return true; });
    navigate("/trains", { state: { results, meta: { from, to, date } } });
  };

  const DropdownList = ({ items, onSelect }: { items: Station[]; onSelect: (s: Station) => void }) => (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
      {items.map((s, i) => (
        <button key={i} onMouseDown={() => onSelect(s)}
          className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors text-sm flex items-center gap-2">
          <MapPin className="h-3 w-3 text-primary shrink-0" />
          <span className="text-foreground font-medium">{s.station_name}</span>
          <span className="text-muted-foreground text-xs ml-auto font-mono">{s.city}</span>
        </button>
      ))}
    </div>
  );

  const HistoryDropdown = ({ items, onSelect }: { items: HistoryItem[]; onSelect: (name: string) => void }) => (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
      <div className="px-4 py-2 border-b border-border">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Previous Searches</span>
      </div>
      {items.map((s, i) => (
        <button key={i} onMouseDown={() => onSelect(s.station_name)}
          className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors text-sm flex items-center gap-2">
          <span className="text-foreground font-medium">{s.station_name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      {/* Dot grid + glows — same as PNR/LiveTrain */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-[radial-gradient(ellipse,rgba(249,115,22,0.07),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(234,88,12,0.05),transparent_70%)]" />
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.08) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <div className="container mx-auto px-4 pt-24 lg:pt-44 pb-8 relative z-10 flex-1 flex flex-col">
        <div className="flex flex-col lg:flex-row items-start justify-center gap-10 lg:gap-36">

          {/* ── LEFT: stencil heading ── */}
          <div className="flex-1 max-w-xl">
            {/* LED blinkers */}
            <div className="flex items-center gap-4 mb-8">
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.div key={i} animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                  className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
              ))}
              <div className="flex-1 h-px bg-primary/15" />
              <span className="text-primary/40 text-xs font-mono uppercase tracking-widest hidden sm:inline">INDIAN RAILWAYS · NEXRAIL</span>
              <div className="flex-1 h-px bg-primary/15" />
              {[0.45, 0.6, 0.75].map((d, i) => (
                <motion.div key={i} animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                  className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
              ))}
            </div>

            {/* Stencil headline */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-[3.8rem] md:text-[6rem] font-black leading-none tracking-tighter text-foreground/80 font-mono select-none">NEX</h1>
              <h1 className="text-[3.8rem] md:text-[6rem] font-black leading-none tracking-tighter text-primary font-mono select-none -mt-2 md:-mt-4">RAIL</h1>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-muted-foreground font-mono text-sm mt-6 max-w-sm leading-relaxed">
              Search trains by route and date — real-time availability, live tracking, instant booking.
            </motion.p>

            {/* Stat pills */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3 mt-8">
              {[["10M+", "Passengers"], ["1000+", "Trains Daily"], ["24/7", "Live Support"]].map(([val, label]) => (
                <div key={label} className="border border-border bg-card rounded-xl px-4 py-2.5 text-center shadow-sm">
                  <p className="text-primary font-black font-mono text-lg leading-none">{val}</p>
                  <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT: Search card ── */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.2 }}
            className="w-full max-w-md xl:max-w-lg shrink-0 mx-auto lg:mx-0">
            <div className="border border-border rounded-2xl bg-card shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-6 pt-5 pb-3 border-b border-border">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Search Trains</p>
              </div>

              <div className="p-4 space-y-2">
                {/* From */}
                <div className="relative group" ref={fromRef}>
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                  <input type="text" value={from} onChange={(e) => handleFromChange(e.target.value)}
                    onFocus={() => { setShowFromDrop(true); if (from.length < 2) fetchHistory("from"); }}
                    placeholder="FROM STATION" autoComplete="off"
                    className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm tracking-wide transition-all" />
                  {showFromDrop && fromSuggestions.length > 0 && (
                    <DropdownList items={fromSuggestions}
                      onSelect={(s) => { setFrom(s.station_name); setFromSuggestions([]); setShowFromDrop(false); }} />
                  )}
                  {showFromDrop && fromSuggestions.length === 0 && fromHistory.length > 0 && (
                    <HistoryDropdown items={fromHistory}
                      onSelect={(name) => { setFrom(name); setShowFromDrop(false); }} />
                  )}
                </div>

                {/* Swap + To */}
                <div className="relative group" ref={toRef}>
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                  <input type="text" value={to} onChange={(e) => handleToChange(e.target.value)}
                    onFocus={() => { setShowToDrop(true); if (to.length < 2) fetchHistory("to"); }}
                    placeholder="TO STATION" autoComplete="off"
                    className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-12 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm tracking-wide transition-all" />
                  <button onMouseDown={swapStations}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full border border-border bg-secondary hover:bg-primary hover:text-white hover:border-primary text-muted-foreground transition-all z-10">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  </button>
                  {showToDrop && toSuggestions.length > 0 && (
                    <DropdownList items={toSuggestions}
                      onSelect={(s) => { setTo(s.station_name); setToSuggestions([]); setShowToDrop(false); }} />
                  )}
                  {showToDrop && toSuggestions.length === 0 && toHistory.length > 0 && (
                    <HistoryDropdown items={toHistory}
                      onSelect={(name) => { setTo(name); setShowToDrop(false); }} />
                  )}
                </div>

                {/* Date */}
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                      onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                  </div>
                </div>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSearch} disabled={searching || !from || !to || !date}
                  className="w-full mt-1 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl flex items-center justify-center gap-2 disabled:opacity-30 transition-all font-mono tracking-wide">
                  {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-4 w-4" /> FIND TRAINS</>}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ════════════ ANIMATED TRAIN DIORAMA ════════════ */}
      <div className="relative w-full h-56 overflow-hidden pointer-events-none select-none" style={{ zIndex: 5 }}>

        {/* Top fade mask — dissolves diorama top edge into page background */}
        <div className="absolute top-0 left-0 right-0 h-40 z-20 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, var(--background) 0%, var(--background) 18%, transparent 100%)" }} />

        {/* Sky */}
        <div className={`absolute inset-0 transition-colors duration-700 ${
          isDark
            ? "bg-gradient-to-b from-transparent via-slate-900/70 to-slate-800/85"
            : "bg-gradient-to-b from-transparent via-orange-50/40 to-orange-100/70"
        }`} />

        {/* Horizon hills */}
        <svg className="absolute bottom-16 left-0 w-full" height="70" viewBox="0 0 1440 70" preserveAspectRatio="none">
          <path d="M0,70 Q200,15 400,42 Q600,68 800,20 Q1000,0 1200,32 Q1380,58 1440,24 L1440,70 Z"
            fill={isDark ? "rgba(12,18,36,0.85)" : "rgba(249,115,22,0.07)"} />
        </svg>

        {/* ── TREES — fixed 30px-per-tree tile so -90px = exactly 3 trees, perfectly seamless ── */}
        <motion.div className="absolute flex items-end" style={{ bottom: "52px" }}
          animate={{ x: [0, -90] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear", repeatDelay: 0 }}>
          {Array.from({ length: 62 }).map((_, i) => {
            const heights = [42, 28, 38];
            const h = heights[i % 3];
            const w = 18;
            const tc = isDark
              ? ["rgba(22,75,38,0.95)", "rgba(18,62,30,0.95)", "rgba(14,50,24,1)"]
              : ["rgba(48,105,54,0.55)", "rgba(40,92,46,0.65)", "rgba(32,78,38,0.72)"];
            const trunk = isDark ? "rgba(55,35,18,0.9)" : "rgba(110,72,30,0.55)";
            return (
              <div key={i} className="shrink-0 flex flex-col items-center" style={{ width: 18, marginRight: 12 }}>
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
                  <polygon points={`${w/2},0 0,${h*0.44} ${w},${h*0.44}`} fill={tc[0]} />
                  <polygon points={`${w/2},${h*0.28} 0,${h*0.70} ${w},${h*0.70}`} fill={tc[1]} />
                  <polygon points={`${w/2},${h*0.50} 0,${h} ${w},${h}`} fill={tc[2]} />
                </svg>
                <div style={{ width: 3, height: 7, background: trunk }} />
              </div>
            );
          })}
        </motion.div>

        {/* ── TELEGRAPH POLES — tile=68px ── */}
        <motion.div className="absolute bottom-14 flex" style={{ gap: "67px" }}
          animate={{ x: [0, -68] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear", repeatDelay: 0 }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="relative shrink-0" style={{ width: 1 }}>
              {isDark && (
                <svg className="absolute overflow-visible pointer-events-none" style={{ top: 0, left: 0 }} width="0" height="0">
                  <defs>
                    <linearGradient id={`cone-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255,228,100,0.20)" />
                      <stop offset="70%" stopColor="rgba(255,228,100,0.04)" />
                      <stop offset="100%" stopColor="rgba(255,228,100,0)" />
                    </linearGradient>
                  </defs>
                  <polygon points="0,0 -38,120 38,120" fill={`url(#cone-${i})`} />
                </svg>
              )}
              <div className="w-px h-20" style={{ background: isDark ? "rgba(100,100,120,0.65)" : "rgba(249,115,22,0.45)" }} />
              <div className="absolute h-px w-14" style={{ top: 13, left: -28, background: isDark ? "rgba(100,100,120,0.5)" : "rgba(249,115,22,0.35)" }} />
              <svg className="absolute overflow-visible" style={{ left: 0, top: 13 }} width="68" height="18" fill="none">
                <path d="M 0 0 Q 34 15 68 0" stroke={isDark ? "rgba(85,85,110,0.5)" : "rgba(249,115,22,0.38)"} strokeWidth="0.8" />
              </svg>
              {isDark && (
                <>
                  <motion.div animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.28, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: (i * 0.19) % 2.4, ease: "easeInOut" }}
                    className="absolute rounded-full"
                    style={{ width: 16, height: 16, top: -8, left: -8,
                      background: "radial-gradient(circle, rgba(255,225,70,0.48) 0%, transparent 100%)" }} />
                  <motion.div animate={{ opacity: [0.78, 1, 0.78] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: (i * 0.19) % 2.4, ease: "easeInOut" }}
                    className="absolute rounded-full"
                    style={{ width: 4, height: 4, top: -2, left: -2, background: "#ffe566",
                      boxShadow: "0 0 5px 2px rgba(255,218,55,0.9), 0 0 12px 5px rgba(255,200,40,0.35)" }} />
                </>
              )}
            </div>
          ))}
        </motion.div>

        {/* ── RAILS — SVG I-beam cross-section, full width ── */}
        {/* Sleepers first (behind rails) — tile=68px */}
        <motion.div className="absolute flex" style={{ bottom: "16px", gap: "28px" }}
          animate={{ x: [0, -68] }}
          transition={{ duration: 0.88, repeat: Infinity, ease: "linear", repeatDelay: 0 }}>
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="shrink-0" style={{
              width: 40, height: 16, borderRadius: 2,
              background: isDark
                ? "linear-gradient(to bottom, rgba(70,62,82,0.9), rgba(50,44,60,0.85))"
                : "linear-gradient(to bottom, rgba(210,168,72,0.85), rgba(175,132,45,0.7))",
            }} />
          ))}
        </motion.div>
        {/* Rail SVG — near rail (bottom) + far rail (top), I-beam shape */}
        <svg className="absolute left-0 w-full" style={{ bottom: 28, pointerEvents: "none" }} height="22"
          viewBox="0 0 100 22" preserveAspectRatio="none">
          {/* Far rail (top of track) */}
          <rect x="0" y="0" width="100" height="1" fill={isDark ? "rgba(210,215,230,0.55)" : "rgba(255,200,140,0.6)"} /> {/* shine */}
          <rect x="0" y="1" width="100" height="3.5" fill={isDark ? "rgba(160,165,185,0.85)" : "rgba(200,130,60,0.85)"} /> {/* head */}
          <rect x="0" y="4.5" width="100" height="1.5" fill={isDark ? "rgba(100,105,125,0.7)" : "rgba(150,90,30,0.7)"} /> {/* web */}
          <rect x="0" y="6" width="100" height="2.5" fill={isDark ? "rgba(140,145,165,0.75)" : "rgba(175,110,40,0.75)"} /> {/* base */}
          {/* Near rail (bottom of track) */}
          <rect x="0" y="12" width="100" height="1" fill={isDark ? "rgba(220,225,245,0.6)" : "rgba(255,210,160,0.65)"} /> {/* shine */}
          <rect x="0" y="13" width="100" height="4" fill={isDark ? "rgba(175,180,200,0.9)" : "rgba(210,140,65,0.9)"} /> {/* head */}
          <rect x="0" y="17" width="100" height="2" fill={isDark ? "rgba(110,115,135,0.75)" : "rgba(160,100,35,0.75)"} /> {/* web */}
          <rect x="0" y="19" width="100" height="3" fill={isDark ? "rgba(155,160,180,0.8)" : "rgba(185,118,45,0.8)"} /> {/* base */}
        </svg>

        {/* ── TRAIN — single continuous loop; both endpoints far off-screen so the instant reset is invisible ── */}
        {[0].map((delaySec) => (
          <motion.div key={delaySec}
            className="absolute bottom-[9px]"
            style={{ left: 0, willChange: "transform" }}
            initial={{ x: -510 }}
            animate={{ x: [-510, vw] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear", repeatDelay: 0, delay: delaySec }}>

            {/* Smoke — 12 rapid puffs, staggered, all from same chimney point */}
            {[
              { d: 0.00, s: 22 }, { d: 0.18, s: 28 }, { d: 0.36, s: 20 },
              { d: 0.54, s: 32 }, { d: 0.72, s: 24 }, { d: 0.90, s: 30 },
              { d: 1.08, s: 21 }, { d: 1.26, s: 34 }, { d: 1.44, s: 26 },
              { d: 1.62, s: 19 }, { d: 1.80, s: 29 }, { d: 1.98, s: 23 },
            ].map(({ d, s }, i) => (
              <motion.div key={i} className="absolute rounded-full"
                style={{
                  width: s, height: s,
                  left: 46,
                  bottom: 78,
                  background: isDark
                    ? `radial-gradient(circle, rgba(155,158,165,0.80) 0%, rgba(120,125,135,0.04) 100%)`
                    : `radial-gradient(circle, rgba(155,155,165,0.72) 0%, rgba(190,190,200,0.04) 100%)`,
                  filter: `blur(${2.5 + s * 0.06}px)`,
                  translateX: "-50%",
                }}
                animate={{
                  opacity: [0, 0.88, 0.5, 0],
                  y: [0, -22, -44, -68],
                  x: [0, -5, -12, -20],
                  scale: [0.28, 0.85, 1.25, 1.65],
                }}
                transition={{ duration: 2.16, repeat: Infinity, delay: d, ease: "easeOut", repeatDelay: 0 }} />
            ))}

            {/* Train SVG — locomotive + 4 carriages */}
            <svg width="300" height="80" viewBox="0 0 222 58" fill="none">
              <defs>
                {isDark && (
                  <filter id="win-glow2" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                )}
                {isDark && (
                  <radialGradient id="hl2" cx="0%" cy="50%" r="100%">
                    <stop offset="0%" stopColor="rgba(255,255,215,0.95)" />
                    <stop offset="100%" stopColor="rgba(255,255,200,0)" />
                  </radialGradient>
                )}
              </defs>

              {/* ── Locomotive (left/front) ── */}
              <rect x="0" y="28" width="16" height="4" rx="2" fill={isDark ? "#7c2d12" : "#9a3412"} /> {/* buffer */}
              <rect x="14" y="6" width="52" height="34" rx="5" fill={isDark ? "#7c2d12" : "#c2410c"} />  {/* loco body */}
              <rect x="18" y="12" width="34" height="18" rx="3" fill={isDark ? "#fde68a" : "white"} opacity={isDark ? 0.95 : 0.9} /> {/* cab window */}
              {isDark && <rect x="18" y="12" width="34" height="18" rx="3" fill="none" stroke="rgba(251,191,36,0.6)" strokeWidth="1.5" filter="url(#win-glow2)" />}
              <rect x="30" y="0" width="9" height="9" rx="2" fill={isDark ? "#431407" : "#7c2d12"} />   {/* chimney */}
              <rect x="14" y="36" width="52" height="4" fill={isDark ? "#6b1c0a" : "#b45309"} />         {/* chassis stripe */}
              {/* Headlight */}
              {isDark
                ? <><ellipse cx="2" cy="35" rx="13" ry="5" fill="url(#hl2)" opacity="0.75" /><circle cx="14" cy="35" r="3" fill="#fffde0" opacity="0.98" /></>
                : <circle cx="14" cy="35" r="3" fill="#fef3c7" opacity="0.8" />}

              {/* Coupler 1 */}
              <rect x="66" y="26" width="6" height="6" rx="1" fill={isDark ? "rgba(90,80,100,0.8)" : "rgba(120,80,30,0.7)"} />

              {/* ── Carriage 1 ── x=72 w=72 */}
              <rect x="72" y="10" width="72" height="30" rx="4" fill={isDark ? "#c2410c" : "#f97316"} />
              <rect x="72" y="34" width="72" height="5" fill={isDark ? "#9a3412" : "#ea580c"} />
              {[84, 116].map(wx => (
                <g key={wx}>
                  <rect x={wx} y="17" width="18" height="13" rx="2.5" fill={isDark ? "#fde68a" : "white"} opacity={isDark ? 0.95 : 0.92} />
                  {isDark && <rect x={wx} y="17" width="18" height="13" rx="2.5" fill="none" stroke="rgba(251,191,36,0.55)" strokeWidth="1.2" filter="url(#win-glow2)" />}
                </g>
              ))}

              {/* Coupler 2 */}
              <rect x="144" y="26" width="6" height="6" rx="1" fill={isDark ? "rgba(90,80,100,0.8)" : "rgba(120,80,30,0.7)"} />

              {/* ── Carriage 2 ── x=150 w=72 */}
              <rect x="150" y="10" width="72" height="30" rx="4" fill={isDark ? "#c2410c" : "#f97316"} />
              <rect x="150" y="34" width="72" height="5" fill={isDark ? "#9a3412" : "#ea580c"} />
              {[162, 194].map(wx => (
                <g key={wx}>
                  <rect x={wx} y="17" width="18" height="13" rx="2.5" fill={isDark ? "#fde68a" : "white"} opacity={isDark ? 0.95 : 0.92} />
                  {isDark && <rect x={wx} y="17" width="18" height="13" rx="2.5" fill="none" stroke="rgba(251,191,36,0.55)" strokeWidth="1.2" filter="url(#win-glow2)" />}
                </g>
              ))}

              {/* Rear buffer */}
              <rect x="222" y="28" width="0" height="4" rx="1" fill={isDark ? "#7c2d12" : "#9a3412"} />
            </svg>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default HeroSearch;
