import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRightLeft, Calendar, Search, MapPin, Loader2, LayoutList } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// Maps to public.class table (class_code, class_name)
const CLASS_OPTIONS = [
  { code: "SL",  name: "Sleeper Class" },
  { code: "3A",  name: "AC 3 Tier" },
  { code: "2A",  name: "AC 2 Tier" },
  { code: "1A",  name: "AC First Class" },
  { code: "CC",  name: "AC Chair Car" },
  { code: "EC",  name: "Executive Chair Car" },
];

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
interface SearchMeta { from: string; to: string; date: string; classCode: string; }

const HeroSearch = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [classCode, setClassCode] = useState("");
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
    navigate("/trains", { state: { results, meta: { from, to, date, classCode } } });
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

      <div className="container mx-auto px-4 pt-44 pb-8 relative z-10 flex-1 flex flex-col">
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
              <span className="text-primary/40 text-xs font-mono uppercase tracking-widest">INDIAN RAILWAYS · NEXRAIL</span>
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
            className="w-full max-w-md xl:max-w-lg shrink-0">
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

                {/* Date + Class */}
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm transition-all [&::-webkit-calendar-picker-indicator]:opacity-50" />
                  </div>
                  <div className="relative group w-36">
                    <LayoutList className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select value={classCode} onChange={(e) => setClassCode(e.target.value)}
                      className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-9 pr-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm appearance-none transition-all [&>option]:bg-background">
                      <option value="">All</option>
                      {CLASS_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
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
        {/* Sky fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-50/40 to-orange-100/70" />

        {/* Horizon hill silhouette */}
        <svg className="absolute bottom-20 left-0 w-full" height="60" viewBox="0 0 1440 60" preserveAspectRatio="none">
          <path d="M0,60 Q180,10 360,38 Q540,65 720,22 Q900,0 1080,30 Q1260,58 1440,18 L1440,60 Z" fill="rgba(249,115,22,0.07)" />
        </svg>

        {/* Scrolling telegraph poles + catenary wires */}
        <motion.div className="absolute bottom-14 flex gap-28"
          animate={{ x: [0, -224] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="relative shrink-0" style={{ width: 1 }}>
              {/* Vertical pole */}
              <div className="w-px h-20 bg-orange-300/50" />
              {/* Crossbar */}
              <div className="absolute w-14 h-px bg-orange-300/40" style={{ top: 14, left: -28 }} />
              {/* Drooping catenary wire to next pole (gap-28 = 112px + 1px pole = 113px) */}
              <svg className="absolute overflow-visible" style={{ left: 0, top: 14 }} width="113" height="22" fill="none">
                <path d="M 0 0 Q 56.5 20 113 0" stroke="rgba(249,115,22,0.45)" strokeWidth="1" />
              </svg>
            </div>
          ))}
        </motion.div>

        {/* Rails */}
        <div className="absolute bottom-[34px] left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />
        <div className="absolute bottom-[22px] left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />

        {/* Scrolling track sleepers */}
        <motion.div className="absolute bottom-[18px] flex gap-7 items-end"
          animate={{ x: [0, -112] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}>
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="w-10 h-4 rounded-[2px] shrink-0 bg-orange-200/70" />
          ))}
        </motion.div>

        {/* ── THE TRAIN ── */}
        <motion.div className="absolute bottom-[9px]"
          animate={{ x: ["-420px", "110vw"] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}>
          {/* Smoke puffs from chimney */}
          {[0, 0.45, 0.9, 1.35].map((delay, i) => (
            <motion.div key={i}
              className="absolute rounded-full"
              style={{
                width: 22 + i * 10, height: 22 + i * 10,
                left: 30 - i * 3, bottom: 88,
                background: `radial-gradient(circle, rgba(180,180,190,${0.75 - i * 0.1}), rgba(200,200,210,0.2))`,
                filter: "blur(2px)",
              }}
              animate={{ opacity: [0.85, 0], y: [0, -55 - i * 14], x: [-3 - i * 6, -16 - i * 12], scale: [0.5, 2.2] }}
              transition={{ duration: 1.7, repeat: Infinity, delay, ease: "easeOut" }} />
          ))}

          {/* Train SVG */}
          <svg width="360" height="80" viewBox="0 0 260 58" fill="none">
            <rect x="10" y="8" width="210" height="32" rx="6" fill="#f97316" />
            <rect x="10" y="30" width="210" height="6" rx="0" fill="#ea580c" />
            {[28, 58, 88, 118, 148].map((x) => (
              <rect key={x} x={x} y={14} width={20} height={14} rx="3" fill="white" opacity="0.92" />
            ))}
            <rect x="198" y="4" width="50" height="36" rx="6" fill="#c2410c" />
            <rect x="204" y="10" width="36" height="18" rx="3" fill="white" opacity="0.92" />
            <rect x="244" y="14" width="12" height="10" rx="3" fill="#9a3412" />
            <rect x="26" y="0" width="10" height="11" rx="2" fill="#7c2d12" />
            <rect x="0" y="28" width="14" height="4" rx="2" fill="#9a3412" />
          </svg>

        </motion.div>
      </div>
    </section>
  );
};

export default HeroSearch;
