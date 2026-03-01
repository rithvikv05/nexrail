import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrainFront, MapPin, Clock, Ruler, Loader2, AlertCircle, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

interface RouteStop {
  stop_no: number;
  via_station_code: string;
  station_name: string;
  city: string;
  km_from_origin: number;
  reach_time: string;
  train_name?: string;
}

const LiveTrain = () => {
  const [trainNo, setTrainNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<RouteStop[]>([]);
  const [trainName, setTrainName] = useState("");
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!trainNo) return;
    const trainInt = parseInt(trainNo);
    if (isNaN(trainInt)) { setError("Please enter a valid numeric train number."); return; }
    setLoading(true);
    setError("");
    setSearched(false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const { data, error: err } = await supabase.rpc("get_train_schedule", { input_train_code: trainInt });
      clearTimeout(timer);
      if (err) { setError(err.message); return; }
      setRoute(data || []);
      setTrainName(data?.[0]?.train_name || "");
      setSearched(true);
    } catch (e: unknown) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout")
          ? "Request timed out — check your connection and try again."
          : `Error: ${msg}`
      );
    } finally {
      setLoading(false);
    }
  };

  const first = route[0];
  const last = route[route.length - 1];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Subtle warm texture */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse,rgba(249,115,22,0.06),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(234,88,12,0.04),transparent_70%)]" />
        {/* Dot grid */}
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.08) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <main className="container mx-auto px-4 pt-32 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto">

          {/* Departure board header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
            {/* Blinker row */}
            <div className="flex items-center gap-4 mb-8">
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.div key={i}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                  className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40"
                />
              ))}
              <div className="flex-1 h-px bg-primary/15" />
              <span className="text-primary/40 text-xs font-mono uppercase tracking-widest">LIVE · DEPARTURES</span>
              <div className="flex-1 h-px bg-primary/15" />
              {[0.45, 0.6, 0.75].map((d, i) => (
                <motion.div key={i}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                  className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40"
                />
              ))}
            </div>
            {/* Stencil LIVE TRAIN */}
            <div className="relative">
              <h1 className="text-[3.5rem] md:text-[6.5rem] font-black leading-none tracking-tighter text-foreground/80 font-mono select-none">
                LIVE
              </h1>
              <h1 className="text-[3.5rem] md:text-[6.5rem] font-black leading-none tracking-tighter text-primary font-mono select-none -mt-3 md:-mt-5">
                TRAIN
              </h1>
              <div className="absolute top-1/2 -translate-y-1/2 right-0 text-right hidden md:block">
                <p className="text-muted-foreground/50 text-xs font-mono uppercase tracking-widest">Indian Railways</p>
                <p className="text-muted-foreground/50 text-xs font-mono">NexRail Platform</p>
              </div>
            </div>
          </motion.div>

          {/* Search — amber themed input */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }} className="mb-10">
            <div className="border border-border rounded-2xl p-1 bg-card shadow-sm">
              <div className="flex gap-2">
                <div className="relative flex-1 group">
                  <TrainFront className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="number"
                    value={trainNo}
                    onChange={(e) => setTrainNo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="TRAIN NUMBER"
                    className="w-full bg-transparent py-4 pl-14 pr-4 text-foreground text-xl placeholder:text-muted-foreground/40 focus:outline-none font-mono tracking-widest"
                  />
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSearch}
                  disabled={loading || !trainNo}
                  className="px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl flex items-center gap-2 disabled:opacity-30 transition-all font-mono tracking-wide">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Zap className="h-5 w-5" /> TRACK</>}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {searched && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {route.length === 0 ? (
                  <div className="text-center py-24">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                      className="h-20 w-20 bg-secondary border border-border rounded-full flex items-center justify-center mx-auto mb-5">
                      <TrainFront className="h-10 w-10 text-muted-foreground/40" />
                    </motion.div>
                    <p className="text-muted-foreground text-lg font-mono uppercase">No service found — {trainNo}</p>
                  </div>
                ) : (
                  <div>
                    {/* LED stat row */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-2 mb-8">
                      {[
                        { label: "TRAIN NO", val: trainNo, color: "text-foreground" },
                        { label: "TOTAL STOPS", val: String(route.length), color: "text-primary" },
                        { label: "KM TOTAL", val: last?.km_from_origin ? String(last.km_from_origin) : "—", color: "text-orange-600" },
                      ].map((stat, i) => (
                        <div key={i} className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
                          <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest mb-2">{stat.label}</p>
                          <p className={`text-2xl md:text-3xl font-black font-mono ${stat.color}`}>{stat.val}</p>
                        </div>
                      ))}
                    </motion.div>

                    {/* Origin/Destination strip */}
                    {first && last && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="mb-8 bg-primary/5 border border-primary/15 rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest">ORIGIN</p>
                          <p className="text-foreground font-black text-xl font-mono">{first.station_name || first.via_station_code}</p>
                          <p className="text-muted-foreground text-xs font-mono">{first.city}</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex items-center gap-2">
                            <div className="flex-1 h-px bg-border" />
                            <motion.div animate={{ x: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                              <TrainFront className="h-6 w-6 text-primary" />
                            </motion.div>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                          {trainName && (
                            <p className="text-primary font-black text-sm font-mono uppercase tracking-wide text-center truncate max-w-[160px]">{trainName}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest">DESTINATION</p>
                          <p className="text-foreground font-black text-xl font-mono">{last.station_name || last.via_station_code}</p>
                          <p className="text-muted-foreground text-xs font-mono">{last.city}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* ===== FLIP-IN DEPARTURE BOARD ===== */}
                    <div>
                      {/* Column headers */}
                      <div className="grid grid-cols-[2rem_1fr_5rem_5rem] gap-3 px-4 mb-2">
                        <div />
                        <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest">STATION</p>
                        <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest text-right">ARR</p>
                        <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest text-right">KM</p>
                      </div>

                      <div className="space-y-1.5">
                        {route.map((stop, i) => {
                          const isTerminal = i === 0 || i === route.length - 1;
                          return (
                            <motion.div
                              key={i}
                              initial={{ rotateX: -90, opacity: 0 }}
                              animate={{ rotateX: 0, opacity: 1 }}
                              transition={{ delay: 0.04 * i, type: "spring", stiffness: 180, damping: 18 }}
                              style={{ perspective: "600px", transformOrigin: "top center" }}
                            >
                              <div className={`grid grid-cols-[2rem_1fr_5rem_5rem] gap-3 items-center px-4 py-3.5 rounded-xl border transition-colors group ${
                                isTerminal
                                  ? "bg-primary/10 border-primary/20"
                                  : "bg-card border-border hover:bg-secondary hover:border-border"
                              }`}>
                                {/* Stop badge */}
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-mono font-black ${
                                  isTerminal ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:text-foreground"
                                } transition-colors`}>
                                  {isTerminal ? <TrainFront className="h-4 w-4" /> : (stop.stop_no ?? i + 1)}
                                </div>
                                {/* Station */}
                                <div>
                                  <p className={`font-bold font-mono text-sm ${
                                    isTerminal ? "text-primary" : "text-foreground/70 group-hover:text-foreground"
                                  } transition-colors`}>
                                    {stop.station_name || stop.via_station_code || "—"}
                                  </p>
                                  <p className="text-muted-foreground text-[10px] font-mono">
                                    {stop.city}{stop.via_station_code ? ` · [${stop.via_station_code}]` : ""}
                                  </p>
                                </div>
                                {/* Time */}
                                <p className={`font-mono text-sm text-right font-bold ${
                                  isTerminal ? "text-primary" : "text-muted-foreground"
                                }`}>
                                  {stop.reach_time || "—"}
                                </p>
                                {/* Distance */}
                                <p className={`font-mono text-sm text-right font-bold ${
                                  isTerminal ? "text-orange-600" : "text-orange-400"
                                }`}>
                                  {stop.km_from_origin ?? "—"}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LiveTrain;
