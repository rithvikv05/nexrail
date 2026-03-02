import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrainFront, User, CreditCard, CheckCircle2, Plus, Trash2,
  Loader2, ArrowLeft, ArrowRight, Wallet, Smartphone, Building2, Banknote,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface BookingState {
  trainNo: number;
  trainName: string;
  fromStation: string;
  toStation: string;
  date: string;
  classCode: string;
}
interface Passenger { name: string; age: string; sex: string; }

const CLASS_NAME_MAP: Record<string, string> = {
  "1A": "AC 1st",
  "2A": "AC 2nd",
  "3A": "AC 3rd",
  SL: "Sleeper",
  CC: "Chair Car",
  EC: "Executive Chair Car",
};

const PAYMENT_MODES = [
  { id: "UPI",         label: "UPI",          icon: Smartphone },
  { id: "Credit Card", label: "Credit Card",  icon: CreditCard },
  { id: "Debit Card",  label: "Debit Card",   icon: CreditCard },
  { id: "Net Banking", label: "Net Banking",  icon: Building2 },
  { id: "Cash",        label: "Cash",         icon: Banknote },
];

const STEPS = ["Passengers", "Payment", "Confirmed"];

const Book = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const booking = state as BookingState;

  useEffect(() => {
    if (!user) {
      navigate("/login", {
        state: {
          returnTo: "/book",
          bookingState: state,
        },
      });
    }
  }, [user, navigate, state]);

  const [step, setStep] = useState(0);
  const [passengers, setPassengers] = useState<Passenger[]>([{ name: "", age: "", sex: "M" }]);
  const [payMode, setPayMode] = useState("UPI");
  const [loading, setLoading] = useState(false);
  const [pnrNo, setPnrNo] = useState<number | null>(null);
  const [transNo, setTransNo] = useState("");
  const [error, setError] = useState("");
  const [farePerPax, setFarePerPax] = useState<number>(0);
  const [fareLoading, setFareLoading] = useState(true);
  const bookingClassCode = booking?.classCode;

  useEffect(() => {
    if (!bookingClassCode) return;
    setFareLoading(true);
    (async () => {
      try {
        const { data } = await supabase.rpc("get_fare", { input_class_code: bookingClassCode });
        setFarePerPax(data != null ? Number(data) : 500);
      } catch {
        setFarePerPax(500);
      } finally {
        setFareLoading(false);
      }
    })();
  }, [bookingClassCode]);

  const totalFare = farePerPax * passengers.length;

  const updatePassenger = (i: number, field: keyof Passenger, val: string) => {
    const updated = [...passengers];
    updated[i] = { ...updated[i], [field]: val };
    setPassengers(updated);
  };

  const handleBooking = async () => {
    if (passengers.some(p => !p.name || !p.age)) {
      setError("Please fill all passenger details.");
      return;
    }
    setLoading(true);
    setError("");

    const { data: classRow, error: classErr } = await supabase
      .from("class")
      .select("class_name, class_code")
      .eq("class_code", booking.classCode)
      .maybeSingle();

    if (classErr) {
      setError(classErr.message || "Failed to resolve class details.");
      setLoading(false);
      return;
    }

    const resolvedClassName = classRow?.class_name || CLASS_NAME_MAP[booking.classCode] || booking.classCode;

    const reservationPayloads = [
      {
        user_code: user.user_id,
        input_train_code: booking.trainNo,
        input_class_name: resolvedClassName,
        input_from_station_name: booking.fromStation,
        input_to_station_name: booking.toStation,
        travel_from_date: booking.date,
        travel_to_date: booking.date,
      },
      {
        user_code: user.user_id,
        train_code: booking.trainNo,
        input_from_station_name: booking.fromStation,
        input_to_station_name: booking.toStation,
        travel_from_date: booking.date,
        travel_to_date: booking.date,
        travel_dist: 0,
      },
      {
        user_code: user.user_id,
        train_code: booking.trainNo,
        input_class_name: resolvedClassName,
        input_from_station_name: booking.fromStation,
        input_to_station_name: booking.toStation,
        travel_from_date: booking.date,
        travel_to_date: booking.date,
      },
    ];

    let resData: { pnr_no: number }[] | null = null;
    let resErr: { message?: string } | null = null;

    for (const payload of reservationPayloads) {
      const { data, error } = await supabase.rpc("create_reservation", payload);
      if (!error && data?.[0]) {
        resData = data;
        resErr = null;
        break;
      }
      resErr = error;

      const errMsg = error?.message || "";
      const isSignatureMiss = errMsg.includes("Could not find the function public.create_reservation");
      if (!isSignatureMiss) {
        break;
      }
    }

    if (resErr || !resData?.[0]) {
      const errMsg = resErr?.message || "";
      const isSignatureMiss = errMsg.includes("Could not find the function public.create_reservation");
      setError(
        isSignatureMiss
          ? "Booking function signature mismatch. Please try again or contact support."
          : (resErr?.message || "Failed to create reservation. Please try again.")
      );
      setLoading(false);
      return;
    }

    const pnr = resData[0].pnr_no;
    setPnrNo(pnr);

    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      await supabase.rpc("add_passenger", {
        pnr_number: pnr,
        passenger_name: p.name,
        passenger_age: parseInt(p.age),
        passenger_sex: p.sex,
        allocated_seat: `${booking.classCode}${i + 1}`,
        ticket_fare: farePerPax,
      });
    }
    setLoading(false);
    setStep(1);
  };

  const handlePayment = async () => {
    if (!pnrNo) return;
    setLoading(true);
    setError("");

    const txn = `TXN${Date.now()}`;
    setTransNo(txn);
    const nowIso = new Date().toISOString();

    const { error: payErr } = await supabase.rpc("make_payment", {
      trans_no: txn,
      pnr_number: pnrNo,
      user_code: user.user_id,
      pay_date: nowIso,
      amount: totalFare,
      pay_mode: payMode,
    });

    if (payErr) { setError(payErr.message); setLoading(false); return; }

    await supabase.rpc("confirm_booking", { pnr_number: pnrNo });

    await supabase.rpc("update_seat_availability", {
      input_train_code: booking.trainNo,
      input_class_code: booking.classCode,
      input_journey_date: booking.date,
      delta: -1,
    });

    setLoading(false);
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-[radial-gradient(ellipse,rgba(249,115,22,0.07),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(234,88,12,0.05),transparent_70%)]" />
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.08) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <main className="container mx-auto px-4 pt-32 pb-24 relative z-10 flex-1 max-w-2xl">

        {/* Page heading */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            {[0, 0.15, 0.3].map((d, i) => (
              <motion.div key={i} animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                className="h-2.5 w-2.5 rounded-full bg-primary shadow-lg shadow-primary/40" />
            ))}
            <div className="flex-1 h-px bg-primary/15" />
            <span className="text-primary/40 text-xs font-mono uppercase tracking-widest hidden sm:inline">NEXRAIL · BOOKING</span>
            <div className="flex-1 h-px bg-primary/15" />
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[2.5rem] md:text-[4rem] font-black leading-none tracking-tighter text-foreground/80 font-mono select-none">BOOK</h1>
              <h1 className="text-[2.5rem] md:text-[4rem] font-black leading-none tracking-tighter text-primary font-mono select-none -mt-1 md:-mt-2">TICKET</h1>
            </div>
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-xs text-muted-foreground font-mono hover:text-primary transition-colors mb-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        </div>

        {/* Train summary card */}
        <div className="bg-card border border-border rounded-2xl px-5 py-4 mb-6 flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <TrainFront className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-foreground truncate">{booking.trainName}</p>
            <p className="text-muted-foreground text-xs font-mono mt-0.5 truncate">
              {booking.fromStation} → {booking.toStation} · {booking.date}
            </p>
          </div>
          <span className="shrink-0 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-black font-mono">
            {booking.classCode}
          </span>
        </div>

        {/* Step tracker */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black font-mono shrink-0 transition-all ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-primary text-white shadow-md shadow-primary/40" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-mono uppercase tracking-widest hidden sm:block ${i === step ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm font-mono">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 0: Passengers ── */}
        {step === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {passengers.map((p, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-primary" /> Passenger {i + 1}
                  </p>
                  {passengers.length > 1 && (
                    <button onClick={() => setPassengers(passengers.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1.5">Full Name</label>
                    <input type="text" value={p.name}
                      onChange={e => updatePassenger(i, "name", e.target.value)}
                      placeholder="Enter name"
                      className="w-full px-4 py-3 bg-secondary rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1.5">Age</label>
                    <input type="number" min={1} max={120} value={p.age}
                      onChange={e => updatePassenger(i, "age", e.target.value)}
                      placeholder="Age"
                      className="w-full px-4 py-3 bg-secondary rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1.5">Sex</label>
                    <select value={p.sex} onChange={e => updatePassenger(i, "sex", e.target.value)}
                      className="w-full px-4 py-3 bg-secondary rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none transition-all">
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-1 border-t border-border/50">
                  <span>Seat: <span className="text-foreground font-bold">{booking.classCode}{i + 1}</span></span>
                  <span>Fare: <span className="text-primary font-bold">{fareLoading ? "…" : `₹${farePerPax}`}</span></span>
                </div>
              </div>
            ))}

            <button onClick={() => setPassengers([...passengers, { name: "", age: "", sex: "M" }])}
              className="w-full border-2 border-dashed border-border rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-sm font-mono">
              <Plus className="h-4 w-4 text-primary" /> ADD PASSENGER
            </button>

            <div className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{passengers.length} pax × ₹{farePerPax}</p>
                <p className="text-2xl font-black font-mono text-foreground mt-0.5">₹{totalFare}</p>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleBooking} disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-black rounded-xl font-mono text-xs tracking-widest hover:bg-primary/90 transition-all disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>PROCEED <ArrowRight className="h-3.5 w-3.5" /></>}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1: Payment ── */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* PNR chip */}
            <div className="bg-card border border-primary/30 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">PNR Number</p>
                <p className="text-2xl font-black font-mono text-primary mt-0.5">{pnrNo}</p>
              </div>
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>

            {/* Payment modes */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Select Payment Mode</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_MODES.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setPayMode(id)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-mono font-bold transition-all
                      ${payMode === id ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-secondary border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fare breakdown */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Fare Summary</p>
              {passengers.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-border/40 pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground font-mono">{p.name || `Passenger ${i + 1}`} · {booking.classCode}{i + 1}</span>
                  <span className="font-black font-mono">₹{farePerPax}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black font-mono text-primary">₹{totalFare}</span>
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handlePayment} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-primary-foreground font-black rounded-2xl font-mono text-sm tracking-widest hover:bg-primary/90 transition-all disabled:opacity-60 shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>PAY ₹{totalFare} <ArrowRight className="h-4 w-4" /></>}
            </motion.button>
          </motion.div>
        )}

        {/* ── STEP 2: Confirmed ── */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="space-y-6">
            <div className="text-center pt-4 pb-2">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="h-20 w-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </motion.div>
              <h2 className="text-3xl font-black font-mono text-foreground">BOOKING</h2>
              <h2 className="text-3xl font-black font-mono text-green-500 -mt-1">CONFIRMED</h2>
              <p className="text-muted-foreground text-sm mt-3">Your ticket has been reserved successfully.</p>
            </div>

            {/* Ticket */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Ticket header */}
              <div className="bg-primary/8 border-b border-border px-5 py-4 flex items-center gap-3">
                <TrainFront className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-black text-foreground text-sm">{booking.trainName}</p>
                  <p className="text-muted-foreground text-xs font-mono">{booking.fromStation} → {booking.toStation}</p>
                </div>
                <span className="ml-auto px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black font-mono">{booking.classCode}</span>
              </div>
              {/* Ticket body */}
              <div className="px-5 py-4 space-y-2.5">
                {[
                  { label: "PNR Number",      val: String(pnrNo), highlight: true },
                  { label: "Transaction No.", val: transNo, highlight: false },
                  { label: "Travel Date",     val: booking.date, highlight: false },
                  { label: "Passengers",      val: String(passengers.length), highlight: false },
                  { label: "Total Fare",      val: `₹${totalFare}`, highlight: true },
                  { label: "Payment Mode",    val: payMode, highlight: false },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground text-xs font-mono uppercase tracking-widest">{f.label}</span>
                    <span className={`font-black font-mono text-sm ${f.highlight ? "text-primary" : "text-foreground"}`}>{f.val}</span>
                  </div>
                ))}
              </div>
              {/* Passenger list */}
              <div className="border-t border-border px-5 py-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Passengers</p>
                <div className="space-y-2">
                  {passengers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-foreground font-bold">{p.name}</span>
                      <span className="text-muted-foreground">{p.age}y · {p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : "Other"} · <span className="text-primary">{booking.classCode}{i + 1}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/")}
                className="flex-1 py-3 border border-border rounded-xl font-mono font-bold text-xs uppercase tracking-widest hover:border-primary/50 transition-all">
                Back to Home
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/profile")}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-mono font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all">
                My Bookings
              </motion.button>
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Book;
