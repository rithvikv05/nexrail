import { useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Train, User, Loader2, AlertCircle,
  Phone, ShieldCheck, KeyRound, ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

interface PnrRow {
  pnr_no: number;
  train_id: number;
  train_name: string;
  from_station: string;
  to_station: string;
  from_date: string;
  to_date: string;
  distance: number;
  pax_name: string;
  pax_age: number;
  pax_sex: string;
  seat_no: string;
  passenger_fare: number;
  total_fare: number;
  transaction_number: string;
  payment_date: string;
  mode: string;
  confirmation_status: string;
}

// step: "input" | "otp" | "result"
type Step = "input" | "otp" | "result";

const PnrStatus = () => {
  const [pnr, setPnr] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PnrRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = () => {
    if (!pnr || !phone) return;
    const pnrInt = parseInt(pnr);
    if (isNaN(pnrInt)) { setError("Please enter a valid numeric PNR."); return; }
    if (phone.replace(/\D/g, "").length < 10) { setError("Please enter a valid 10-digit phone number."); return; }
    setError("");
    // Simulate OTP sent
    setStep("otp");
  };

  const handleVerifyOtp = async () => {
    if (otp !== "0000") { setError("Invalid OTP. Please try again."); return; }
    const pnrInt = parseInt(pnr);
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const { data, error: err } = await supabase.rpc("get_pnr_details", { pnr_number: pnrInt });
      clearTimeout(timer);
      if (err) { setError(err.message); return; }
      setRows(data || []);
      setSearched(true);
      setStep("result");
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

  const handleReset = () => {
    setPnr(""); setPhone(""); setOtp("");
    setStep("input"); setRows([]); setSearched(false); setError("");
  };

  const journey = rows[0];
  const totalFare = journey?.total_fare || rows.reduce((a, r) => a + (r.passenger_fare || 0), 0);
  const status = journey?.confirmation_status || "";
  const isConfirmed = status === "Confirmed";
  const isCancelled = status === "Cancelled";
  const stampColor = isConfirmed
    ? "border-green-600 text-green-600"
    : isCancelled
    ? "border-red-600 text-red-600"
    : "border-yellow-600 text-yellow-600";
  const stampText = isConfirmed ? "CONFIRMED" : isCancelled ? "CANCELLED" : "WAITING";

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <Navbar />

      {/* Same dot grid as LiveTrain */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse,rgba(249,115,22,0.06),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(234,88,12,0.04),transparent_70%)]" />
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.08) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <main className="flex-1 min-h-screen container mx-auto px-4 pt-32 pb-24 relative z-10">
        <div className="max-w-2xl mx-auto">

          {/* Header — same LED blinker + stencil style as LiveTrain */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
            <div className="flex items-center gap-4 mb-8">
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.div key={i}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                  className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
              ))}
              <div className="flex-1 h-px bg-primary/15" />
              <span className="text-primary/40 text-xs font-mono uppercase tracking-widest">LIVE · PNR STATUS</span>
              <div className="flex-1 h-px bg-primary/15" />
              {[0.45, 0.6, 0.75].map((d, i) => (
                <motion.div key={i}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                  className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
              ))}
            </div>
            <div className="relative">
              <h1 className="text-[3.5rem] md:text-[6.5rem] font-black leading-none tracking-tighter text-foreground/80 font-mono select-none">PNR</h1>
              <h1 className="text-[3.5rem] md:text-[6.5rem] font-black leading-none tracking-tighter text-primary font-mono select-none -mt-3 md:-mt-5">CHECK</h1>
              <div className="absolute top-1/2 -translate-y-1/2 right-0 text-right hidden md:block">
                <p className="text-muted-foreground/50 text-xs font-mono uppercase tracking-widest">Indian Railways</p>
                <p className="text-muted-foreground/50 text-xs font-mono">NexRail Platform</p>
              </div>
            </div>
          </motion.div>

          {/* Step indicators */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="flex items-center gap-3 mb-8">
            {(["input", "otp", "result"] as Step[]).map((s, i) => (
              <Fragment key={s}>
                <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-widest transition-colors ${
                  step === s ? "text-primary font-black" : (step === "result" || (step === "otp" && i === 0)) ? "text-muted-foreground/60" : "text-muted-foreground/30"
                }`}>
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center text-[10px] font-black transition-all ${
                    step === s ? "border-primary bg-primary text-primary-foreground" :
                    (step === "result" || (step === "otp" && i === 0)) ? "border-muted-foreground/40 text-muted-foreground/40" :
                    "border-muted-foreground/20 text-muted-foreground/20"
                  }`}>{i + 1}</div>
                  <span className="hidden sm:inline">{s === "input" ? "Details" : s === "otp" ? "Verify" : "Ticket"}</span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-border" />}
              </Fragment>
            ))}
          </motion.div>

          {/* ── STEP 1: PNR + Phone ── */}
          <AnimatePresence mode="wait">
            {step === "input" && (
              <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", bounce: 0.2 }} className="mb-10">
                <div className="border border-border rounded-2xl bg-card shadow-sm overflow-hidden">
                  {/* PNR row */}
                  <div className="flex items-center border-b border-border group">
                    <Search className="ml-5 h-5 w-5 text-muted-foreground group-focus-within:text-primary shrink-0 transition-colors" />
                    <input
                      type="text"
                      value={pnr}
                      onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      placeholder="PNR NUMBER"
                      className="flex-1 bg-transparent py-4 px-4 text-foreground text-lg placeholder:text-muted-foreground/40 focus:outline-none font-mono tracking-widest"
                    />
                    <span className="mr-5 text-xs text-muted-foreground/40 font-mono shrink-0">{pnr.length}/10</span>
                  </div>
                  {/* Phone row */}
                  <div className="flex items-center group">
                    <Phone className="ml-5 h-5 w-5 text-muted-foreground group-focus-within:text-primary shrink-0 transition-colors" />
                    <span className="ml-3 text-muted-foreground font-mono text-sm shrink-0">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      placeholder="MOBILE NUMBER"
                      className="flex-1 bg-transparent py-4 px-3 text-foreground text-lg placeholder:text-muted-foreground/40 focus:outline-none font-mono tracking-widest"
                    />
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleSendOtp}
                      disabled={pnr.length === 0 || phone.length < 10}
                      className="m-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl flex items-center gap-2 disabled:opacity-30 transition-all font-mono tracking-wide text-sm shrink-0">
                      SEND OTP <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", bounce: 0.2 }} className="mb-10">
                <div className="border border-border rounded-2xl bg-card shadow-sm">
                  <div className="px-6 pt-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-3 mb-1">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <p className="text-foreground font-black font-mono text-sm uppercase tracking-widest">OTP Sent</p>
                    </div>
                    <p className="text-muted-foreground text-xs font-mono">A 4-digit OTP was sent to +91 {phone}</p>
                  </div>
                  <div className="flex items-center group">
                    <KeyRound className="ml-5 h-5 w-5 text-muted-foreground group-focus-within:text-primary shrink-0 transition-colors" />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                      placeholder="ENTER OTP"
                      className="flex-1 bg-transparent py-4 px-4 text-foreground text-2xl placeholder:text-muted-foreground/40 focus:outline-none font-mono tracking-[0.5em]"
                      maxLength={4}
                    />
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length < 4}
                      className="m-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl flex items-center gap-2 disabled:opacity-30 transition-all font-mono tracking-wide text-sm shrink-0">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>VERIFY <ShieldCheck className="h-4 w-4" /></>}
                    </motion.button>
                  </div>
                </div>
                <button onClick={() => { setStep("input"); setOtp(""); setError(""); }}
                  className="mt-3 text-xs text-muted-foreground font-mono hover:text-primary transition-colors">
                  ← Change PNR or phone number
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
            {searched && step === "result" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {!journey ? (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-20">
                    <div className="h-16 w-16 bg-secondary border border-border rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-muted-foreground text-lg font-mono uppercase">No booking found — {pnr}</p>
                    <button onClick={handleReset} className="mt-6 text-xs text-primary font-mono hover:underline">← Search again</button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ y: 60, opacity: 0, scale: 0.96 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: "spring", bounce: 0.3 }}
                  >
                    {/* ===== PHYSICAL PRINTED TICKET ===== */}
                    <div className="bg-white rounded-3xl overflow-hidden shadow-2xl shadow-orange-300/50 border border-orange-100">

                      {/* Orange header band */}
                      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 px-5 sm:px-8 py-5 sm:py-7 relative overflow-hidden">
                        <div className="absolute right-[-30px] top-[-30px] w-36 h-36 rounded-full bg-white/10" />
                        <div className="absolute right-12 top-[-8px] w-16 h-16 rounded-full bg-white/[0.07]" />
                        <div className="flex items-start justify-between relative z-10">
                          <div>
                            <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mb-1">NexRail — Booking Confirmation</p>
                            <p className="text-white text-2xl sm:text-4xl font-black">{journey.train_name || `Train #${journey.train_id}`}</p>
                          </div>
                          {/* Rubber stamp */}
                          <div className={`h-20 w-20 rounded-full border-[3px] ${stampColor} bg-white flex flex-col items-center justify-center rotate-[12deg] shadow-lg shrink-0`}>
                            <p className="text-[8px] font-black tracking-widest text-center leading-tight px-1">{stampText}</p>
                          </div>
                        </div>
                        {/* From → To in header */}
                        <div className="flex items-center gap-3 mt-5 relative z-10">
                          <div>
                            <p className="text-orange-200 text-xs font-bold uppercase tracking-widest">From</p>
                            <p className="text-white text-xl font-black">{journey.from_station || "—"}</p>
                          </div>
                          <div className="flex-1 flex items-center gap-1">
                            <div className="flex-1 h-px bg-white/30" />
                            <Train className="h-4 w-4 text-white/70" />
                            <div className="flex-1 h-px bg-white/30" />
                          </div>
                          <div className="text-right">
                            <p className="text-orange-200 text-xs font-bold uppercase tracking-widest">To</p>
                            <p className="text-white text-xl font-black">{journey.to_station || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Ticket meta row */}
                      <div className="bg-[#fffdf9] px-5 sm:px-8 py-4 sm:py-6 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
                        {[
                          { label: "PNR", val: String(journey.pnr_no), mono: true },
                          { label: "Date", val: journey.from_date || "—" },
                          { label: "Arrival", val: journey.to_date || "—" },
                          { label: "Distance", val: journey.distance != null ? `${journey.distance} km` : "—" },
                        ].map((f) => (
                          <div key={f.label}>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{f.label}</p>
                            <p className={`text-slate-800 font-bold ${f.mono ? "font-mono text-sm" : ""}`}>{f.val}</p>
                          </div>
                        ))}
                      </div>

                      {/* Perforated tear edge */}
                      <div className="relative h-0 mx-0">
                        <div className="mx-6 border-t-2 border-dashed border-orange-200" />
                        <div className="absolute left-0 top-[-11px] w-5 h-5 rounded-full bg-amber-50" />
                        <div className="absolute right-0 top-[-11px] w-5 h-5 rounded-full bg-amber-50" />
                      </div>

                      {/* Passenger section */}
                      <div className="bg-[#fff7f0] px-5 sm:px-8 py-5 sm:py-6">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                          <User className="h-3 w-3" /> Passengers
                        </p>
                        <div className="space-y-3">
                          {rows.map((r, i) => (
                            <motion.div key={i}
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                              className="flex items-center justify-between py-2.5 border-b border-orange-100 last:border-0">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 font-black flex items-center justify-center text-sm shrink-0">
                                  {r.pax_name?.[0]?.toUpperCase() || "?"}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{r.pax_name || "—"}</p>
                                  <p className="text-slate-400 text-xs">{r.pax_age}y · {r.pax_sex === "M" ? "Male" : r.pax_sex === "F" ? "Female" : r.pax_sex || "—"}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-bold text-slate-700 text-sm">{r.seat_no || "—"}</p>
                                <p className="text-orange-500 font-bold text-xs">₹{r.passenger_fare || "—"}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Payment dark strip */}
                      <div className="bg-slate-800 px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Total Paid</p>
                          <p className="text-white text-2xl font-black">₹{totalFare || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Mode</p>
                          <p className="text-slate-200 text-sm font-mono">{journey.mode || "—"}</p>
                          <p className="text-slate-500 text-xs font-mono truncate max-w-[160px]">{journey.transaction_number || "—"}</p>
                        </div>
                      </div>

                      {/* Barcode strip */}
                      <div className="bg-white px-5 sm:px-8 py-4 sm:py-5 flex flex-col items-center gap-2">
                        <div className="flex gap-px h-10 overflow-hidden">
                          {[2,1,3,1,2,2,1,3,1,2,1,2,3,1,2,1,2,3,2,1,3,1,2,1,2,1,3,2,1,2,1,3,1,2,2,1,3,1,2,1].map((w, i) => (
                            <div key={i} className="bg-slate-800 shrink-0" style={{ width: `${w * 2}px` }} />
                          ))}
                        </div>
                        <p className="font-mono text-[10px] text-slate-400 tracking-[0.35em]">{String(journey.pnr_no)}</p>
                      </div>
                    </div>
                    {/* Search again */}
                    <div className="text-center mt-6">
                      <button onClick={handleReset}
                        className="text-xs text-primary font-mono hover:underline tracking-widest uppercase">
                        ← Check another PNR
                      </button>
                    </div>
                  </motion.div>
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

export default PnrStatus;
