import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, TrainFront, ArrowLeft, ChevronDown, ChevronUp, ArrowRight, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface TrainResult {
  train_no: string;
  train_name: string;
  train_type: string;
  departure_time: string;
  arrival_time: string;
}
interface SearchMeta { from: string; to: string; date: string; }

const CLASS_BOGIES = [
  { code: "1A", label: "AC 1st",  price: 3000, color: "#9a3412", count: 2, classId: 1 },
  { code: "2A", label: "AC 2nd",  price: 1800, color: "#c2410c", count: 3, classId: 2 },
  { code: "3A", label: "AC 3rd",  price: 1200, color: "#ea580c", count: 3, classId: 3 },
  { code: "SL", label: "Sleeper", price: 500,  color: "#f97316", count: 4, classId: 4 },
];

const buildBogies = () => {
  const bogies: { id: string; code: string; label: string; price: number; color: string; num: number }[] = [];
  bogies.push({ id: "ENG", code: "ENG", label: "Engine", price: 0, color: "#1c1917", num: 0 });
  CLASS_BOGIES.forEach(cls => {
    for (let n = 1; n <= cls.count; n++) {
      bogies.push({ id: `${cls.code}-${n}`, code: cls.code, label: cls.label, price: cls.price, color: cls.color, num: n });
    }
  });
  bogies.push({ id: "GRD", code: "GRD", label: "Guard", price: 0, color: "#1c1917", num: 0 });
  return bogies;
};

const TrainSearch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const results: TrainResult[] = location.state?.results ?? [];
  const meta: SearchMeta | null = location.state?.meta ?? null;

  const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  const [expandedTrain, setExpandedTrain] = useState<string | null>(null);
  const [liveResults, setLiveResults] = useState<TrainResult[]>(results);
  const [currentDate, setCurrentDate] = useState(meta?.date ?? "");
  const [dateLoading, setDateLoading] = useState(false);

  const handleDateChange = async (newDate: string) => {
    if (!newDate || !meta) return;
    setCurrentDate(newDate);
    setDateLoading(true);
    setSeatAvail({});
    setExpandedTrain(null);
    setSelectedBogie(null);
    const trainDay = DAYS[new Date(newDate).getDay()];
    const { data } = await supabase.rpc("search_trains", {
      from_station_name: meta.from,
      to_station_name: meta.to,
      train_day: trainDay,
    });
    const seen = new Set<string>();
    const fresh: TrainResult[] = (data || [])
      .map((r: TrainResult) => ({ ...r, train_no: String(r.train_no) }))
      .filter((r: TrainResult) => { if (seen.has(r.train_no)) return false; seen.add(r.train_no); return true; });
    setLiveResults(fresh);
    setDateLoading(false);
  };
  const [selectedBogie, setSelectedBogie] = useState<{ trainNo: string; bogieId: string; code: string; price: number } | null>(null);
  const [authError, setAuthError] = useState("");
  // { trainNo: { classCode: seats } }
  const [seatAvail, setSeatAvail] = useState<Record<string, Record<string, number | null>>>({});
  const [availLoading, setAvailLoading] = useState<string | null>(null);

  const CLASS_AVAIL_MAP: Record<string, { dbName: string; col: string }> = {
    "1A": { dbName: "1ac",     col: "1ac"     },
    "2A": { dbName: "2ac",     col: "2ac"     },
    "3A": { dbName: "3ac",     col: "3ac"     },
    "SL": { dbName: "sleeper", col: "sleeper" },
  };

  const fetchAvailability = useCallback(async (trainNo: string) => {
    if (seatAvail[trainNo]) return;
    setAvailLoading(trainNo);
    const trainCode = parseInt(trainNo);
    const journeyDate = currentDate || meta?.date || new Date().toISOString().split("T")[0];

    const availResults = await Promise.all(
      CLASS_BOGIES.map(async cls => {
        const mapping = CLASS_AVAIL_MAP[cls.code];
        if (!mapping) return { code: cls.code, seats: null };

        // Try the RPC first
        const { data, error } = await supabase.rpc("check_seat_availability", {
          input_train_code: trainCode,
          input_class_name: mapping.dbName,
          input_journey_date: journeyDate,
        });

        if (!error) {
          const row = data?.[0];
          const seats = row != null ? (row.available ?? row[mapping.col] ?? Object.values(row)[0] ?? null) : null;
          return { code: cls.code, seats: seats as number | null };
        }

        // RPC failed — fall back to direct table read
        const { data: row, error: tblErr } = await supabase
          .from("seat_availability")
          .select(mapping.col)
          .eq("train_code", trainCode)
          .eq("journey_date", journeyDate)
          .single();
        if (tblErr) return { code: cls.code, seats: null };
        return { code: cls.code, seats: (row?.[mapping.col as keyof typeof row] as number | null) ?? null };
      })
    );

    const map: Record<string, number | null> = {};
    availResults.forEach(r => { map[r.code] = r.seats; });
    setSeatAvail(prev => ({ ...prev, [trainNo]: map }));
    setAvailLoading(null);
  }, [seatAvail, meta, currentDate]);

  const fmt = (t: string) => t?.slice(0, 5) || "—";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-[radial-gradient(ellipse,rgba(249,115,22,0.07),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(234,88,12,0.05),transparent_70%)]" />
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.08) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <main className="container mx-auto px-4 pt-32 pb-24 relative z-10 flex-1">
        {/* ── Header row ── */}
        <div className="mb-10">
          {/* LED blinkers */}
          <div className="flex items-center gap-3 mb-8">
            {[0, 0.15, 0.3].map((d, i) => (
              <motion.div key={i} animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
            ))}
            <div className="flex-1 h-px bg-primary/15" />
            <span className="text-primary/40 text-xs font-mono uppercase tracking-widest">NEXRAIL · SEARCH RESULTS</span>
            <div className="flex-1 h-px bg-primary/15" />
            {[0.45, 0.6, 0.75].map((d, i) => (
              <motion.div key={i} animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-[3rem] md:text-[5rem] font-black leading-none tracking-tighter text-foreground/80 font-mono select-none">TRAIN</h1>
              <h1 className="text-[3rem] md:text-[5rem] font-black leading-none tracking-tighter text-primary font-mono select-none -mt-2 md:-mt-4">SEARCH</h1>
            </div>
            <button onClick={() => navigate("/")}
              className="flex items-center gap-2 text-xs text-muted-foreground font-mono hover:text-primary transition-colors mb-2">
              <ArrowLeft className="h-3.5 w-3.5" /> New Search
            </button>
          </div>
        </div>

        {/* ── Stat row ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-2 mb-8">
          {[
            { label: "ROUTE", val: meta ? `${meta.from.split(" ")[0]} → ${meta.to.split(" ")[0]}` : "—", color: "text-foreground" },
            { label: "TRAINS FOUND", val: dateLoading ? "…" : String(liveResults.length), color: "text-primary" },
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest mb-1">{stat.label}</p>
              <p className={`text-base md:text-xl font-black font-mono truncate ${stat.color}`}>{stat.val}</p>
            </div>
          ))}
          <div className="bg-card border border-primary/40 rounded-xl p-4 text-center shadow-sm">
            <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest mb-1">DATE</p>
            <input
              type="date"
              value={currentDate}
              onChange={e => handleDateChange(e.target.value)}
              onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
              className="text-base md:text-xl font-black font-mono text-orange-500 bg-transparent border-none outline-none cursor-pointer w-full text-center"
            />
          </div>
        </motion.div>

        {/* ── Results ── */}
        {dateLoading && (
          <div className="flex items-center justify-center py-24 gap-3 text-primary font-mono text-sm">
            <Loader2 className="h-5 w-5 animate-spin" /> Searching trains for new date…
          </div>
        )}
        {!dateLoading && liveResults.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24">
            <div className="h-20 w-20 bg-secondary border border-border rounded-full flex items-center justify-center mx-auto mb-5">
              <TrainFront className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-lg font-mono uppercase tracking-wide">No trains found for this route</p>
            <button onClick={() => navigate("/")}
              className="mt-4 text-xs text-primary font-mono hover:underline">← New Search</button>
          </motion.div>
        )}
        {!dateLoading && <div className="space-y-3">
          {liveResults.map((train, i) => {
            const isExpanded = expandedTrain === train.train_no;
            const bogies = buildBogies();
            return (
              <motion.div key={train.train_no}
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                transition={{ delay: 0.05 * i, type: "spring", stiffness: 180, damping: 18 }}
                style={{ perspective: 600 }}
                className={`bg-card border rounded-2xl overflow-hidden transition-colors duration-200
                  ${isExpanded ? "border-primary/50 shadow-md shadow-primary/10" : "border-border hover:border-primary/30"}`}>

                {/* Train row */}
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <TrainFront className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-foreground truncate">{train.train_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-muted-foreground text-xs font-mono">#{train.train_no}</p>
                        {train.train_type && (
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-mono uppercase">
                            {train.train_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">DEPT</p>
                      <p className="font-black font-mono text-foreground text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3 text-primary" />{fmt(train.departure_time)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">ARR</p>
                      <p className="font-black font-mono text-muted-foreground text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />{fmt(train.arrival_time)}
                      </p>
                    </div>
                  </div>

                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const next = isExpanded ? null : train.train_no;
                      setExpandedTrain(next);
                      setSelectedBogie(null);
                      if (next) fetchAvailability(next);
                    }}
                    className={`shrink-0 px-5 py-2.5 font-black rounded-xl font-mono text-xs tracking-widest
                      flex items-center gap-1.5 transition-all
                      ${isExpanded
                        ? "bg-primary/10 text-primary border border-primary/40"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                    SELECT CLASS {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </motion.button>
                </div>

                {/* Bogie panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}>

                      <div className="border-t border-primary/20 bg-gradient-to-b from-background to-secondary/30 px-4 pt-5 pb-6 relative overflow-hidden">
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,theme(colors.primary.DEFAULT/0.12),transparent_60%)]" />

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-primary/90">
                            Composition: 2×1A · 3×2A · 3×3A · 4×SL
                          </p>
                        </div>

                        {/* Seat availability loading */}
                        <AnimatePresence>
                          {availLoading === train.train_no && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="relative z-10 flex items-center gap-2 text-[10px] font-mono text-primary bg-primary/10 border border-primary/30 rounded-md px-3 py-2 mb-4 w-fit">
                              <Loader2 className="h-3 w-3 animate-spin" /> Syncing seat matrix…
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="relative z-10 flex flex-wrap items-center gap-2 mb-4">
                          {CLASS_BOGIES.map((classMeta) => {
                            const classSeats = seatAvail[train.train_no]?.[classMeta.code];
                            const classLoaded = seatAvail[train.train_no] !== undefined;
                            return (
                              <div
                                key={`class-pool-${classMeta.code}`}
                                className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ background: classMeta.color }} />
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {classMeta.code}
                                </span>
                                <span className={`text-[10px] font-mono font-black ${
                                  !classLoaded || classSeats === null
                                    ? "text-muted-foreground"
                                    : classSeats === 0
                                    ? "text-red-500"
                                    : classSeats < 10
                                    ? "text-yellow-500"
                                    : "text-green-600"
                                }`}>
                                  {!classLoaded ? "…" : classSeats === null ? "N/A" : classSeats === 0 ? "WL" : `${classSeats} AVL`}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Train bogies */}
                        <div className="relative z-10 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-3 py-6">
                          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[4px] rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent shadow-[0_0_18px_theme(colors.primary.DEFAULT/0.35)]" />
                          <div className="relative pb-6" style={{ minWidth: `${bogies.length * 98}px` }}>
                            <div className="flex flex-wrap items-end gap-2.5">
                              {bogies.map((b, idx) => {
                                const isSpec = b.code === "ENG" || b.code === "GRD";
                                const isSelected = selectedBogie?.bogieId === b.id && selectedBogie?.trainNo === train.train_no;
                                const classSeats = seatAvail[train.train_no]?.[b.code];
                                const isSoldOut = !isSpec && classSeats !== undefined && classSeats !== null && classSeats <= 0;
                                return (
                                  <motion.div
                                    key={b.id}
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03, type: "spring", stiffness: 220, damping: 20 }}
                                    className="flex flex-col items-center group">
                                    <span className={`text-[9px] font-mono h-5 flex items-center transition-all ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                                      {!isSpec ? `₹${b.price}` : ""}
                                    </span>
                                    <motion.button
                                      disabled={isSpec || isSoldOut}
                                      onClick={() => setSelectedBogie(
                                        isSelected
                                          ? null
                                          : { trainNo: train.train_no, bogieId: b.id, code: b.code, price: b.price }
                                      )}
                                      whileHover={!isSpec && !isSoldOut ? { y: -4, scale: 1.03 } : {}}
                                      whileTap={!isSpec && !isSoldOut ? { scale: 0.97 } : {}}
                                      className={`relative flex flex-col items-center justify-between transition-all select-none overflow-hidden
                                        ${isSpec ? "w-[74px] h-14 rounded-lg cursor-default border border-border/70 bg-muted/30" : "w-[82px] h-[92px] rounded-xl border border-border/70 bg-card shadow-lg"}
                                        ${isSoldOut ? "cursor-not-allowed opacity-40 grayscale" : "cursor-pointer"}
                                        ${isSelected ? "ring-2 ring-primary/80 scale-105 z-20 border-primary/60 shadow-[0_0_20px_theme(colors.primary.DEFAULT/0.35)]" : !isSoldOut ? "hover:border-primary/40 hover:shadow-[0_0_14px_theme(colors.primary.DEFAULT/0.2)]" : ""}`}
                                      style={{ background: isSpec ? undefined : b.color }}>
                                      {!isSpec && <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/30" />}

                                      <div className="pt-3 flex flex-col items-center">
                                        <span className="text-[18px] font-black font-mono text-white leading-none drop-shadow-md">{b.code}</span>
                                        {!isSpec && (
                                          isSoldOut
                                            ? <span className="mt-1 text-[9px] font-bold text-white/90 px-2 py-[1px] rounded-full bg-black/40 border border-white/20 tracking-wider">FULL</span>
                                            : <span className="mt-1 text-[9px] font-mono text-white/80 px-2 py-[1px] rounded-full bg-black/20 border border-white/20">C-{b.num}</span>
                                        )}
                                      </div>

                                        {!isSpec && <div className="w-full h-[2px] mt-2 bg-white/30" />}
                                    </motion.button>
                                    <span className={`text-[8px] font-mono mt-4 text-center leading-tight max-w-[82px] transition-colors ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                                      {!isSpec ? b.label : ""}
                                    </span>
                                  </motion.div>
                                );
                              })}
                            </div>
                            <div className="mt-3 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
                          {CLASS_BOGIES.map(c => (
                            <div key={c.code} className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1">
                              <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                              <span className="text-[10px] font-mono text-muted-foreground">{c.code} – ₹{c.price}</span>
                            </div>
                          ))}
                        </div>

                        {/* Proceed bar */}
                        <AnimatePresence>
                          {selectedBogie?.trainNo === train.train_no && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-primary/30 rounded-xl px-4 sm:px-5 py-3">
                              <div>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Selected</p>
                                <p className="font-black font-mono text-foreground">
                                  {selectedBogie.code} Class &nbsp;·&nbsp; <span className="text-primary">₹{selectedBogie.price}</span>
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                {authError && (
                                  <p className="text-[10px] font-mono text-red-500 text-right">{authError}</p>
                                )}
                                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                  onClick={() => {
                                    if (!user) {
                                      setAuthError("Please log in to book a ticket. Redirecting…");
                                      setTimeout(() => navigate("/login", {
                                        state: {
                                          returnTo: "/book",
                                          bookingState: {
                                            trainNo: parseInt(train.train_no),
                                            trainName: train.train_name,
                                            fromStation: meta?.from,
                                            toStation: meta?.to,
                                            date: currentDate || meta?.date,
                                            classCode: selectedBogie!.code,
                                          },
                                        },
                                      }), 1200);
                                      return;
                                    }
                                    navigate("/book", {
                                      state: {
                                        trainNo: parseInt(train.train_no),
                                        trainName: train.train_name,
                                        fromStation: meta?.from,
                                        toStation: meta?.to,
                                        date: currentDate || meta?.date,
                                        classCode: selectedBogie!.code,
                                      },
                                    });
                                  }}
                                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-black rounded-xl font-mono text-xs tracking-widest hover:bg-primary/90 transition-all">
                                  PROCEED <ArrowRight className="h-3.5 w-3.5" />
                                </motion.button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>}
      </main>

      <Footer />
    </div>
  );
};

export default TrainSearch;
