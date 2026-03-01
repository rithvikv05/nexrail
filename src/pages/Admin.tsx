import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  TrainFront, Plus, Trash2, Loader2, LogOut, ShieldCheck, AlertCircle, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const TRAIN_TYPES = ["Express","Superfast","Passenger","Rajdhani","Shatabdi","Duronto","InterCity","Local"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

interface Train {
  train_no: number;
  train_name: string;
  train_type: string;
  train_running_days?: string;
  source_station_id?: string;
  destination_station_id?: string;
  distance?: number;
}

interface Station {
  station_code: string;
  station_name: string;
}

const emptyStop  = { via_station_code: "", km_from_origin: "", reach_time: "" };
const emptyAvail = { journey_date: "", sleeper: "", ac3: "", ac2: "", ac1: "" };

const emptyForm = {
  train_no: "",
  train_name: "",
  train_type: "Express",
  train_running_days: "",
  source_station_id: "",
  destination_station_id: "",
  distance: "",
};

const Admin = () => {
  const navigate = useNavigate();

  const [trains, setTrains]       = useState<Train[]>([]);
  const [stations, setStations]   = useState<Station[]>([]);
  const [loading, setLoading]     = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);
  const [adding, setAdding]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [stops, setStops]         = useState([{ ...emptyStop }]);
  const [avails, setAvails]       = useState([{ ...emptyAvail }]);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTrains = async () => {
    setLoading(true);
    const { data } = await supabase.from("train").select("*").order("train_no");
    setTrains((data as Train[]) || []);
    setLoading(false);
  };

  const fetchStations = async () => {
    const { data } = await supabase.from("station").select("station_code, station_name").order("station_name");
    setStations((data as Station[]) || []);
  };

  useEffect(() => { fetchTrains(); fetchStations(); }, []);

  const handleDelete = async (trainNo: number) => {
    if (!confirm(`Delete train #${trainNo}? This cannot be undone.`)) return;
    setDeleting(trainNo);
    const { error } = await supabase.rpc("admin_delete_train", { input_train_no: trainNo });
    if (error) showToast(error.message, false);
    else { showToast(`Train ${trainNo} deleted.`); fetchTrains(); }
    setDeleting(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.train_no || !form.train_name) return;
    setAdding(true);
    const trainNo = parseInt(form.train_no);
    const { error } = await supabase.rpc("admin_create_train", {
      input_train_no:               trainNo,
      input_train_name:             form.train_name,
      input_train_type:             form.train_type,
      input_train_running_days:     form.train_running_days || null,
      input_source_station_id:      form.source_station_id  || null,
      input_destination_station_id: form.destination_station_id || null,
      input_distance:               form.distance ? parseInt(form.distance) : null,
    });
    if (error) { showToast(error.message, false); setAdding(false); return; }

    for (const s of stops.filter(s => s.via_station_code)) {
      const { error: stopErr } = await supabase.rpc("admin_add_stop", {
        input_train_code:       trainNo,
        input_via_station_code: s.via_station_code,
        input_km_from_origin:   s.km_from_origin ? parseInt(s.km_from_origin) : null,
        input_reach_time:       s.reach_time || null,
      });
      if (stopErr) { showToast("Stop failed: " + stopErr.message, false); setAdding(false); fetchTrains(); return; }
    }

    for (const a of avails.filter(a => a.journey_date)) {
      const { error: availErr } = await supabase.rpc("admin_add_seat_avail", {
        input_train_code:   trainNo,
        input_journey_date: a.journey_date,
        input_sleeper:      a.sleeper ? parseInt(a.sleeper) : 0,
        input_3ac:          a.ac3    ? parseInt(a.ac3)     : 0,
        input_2ac:          a.ac2    ? parseInt(a.ac2)     : 0,
        input_1ac:          a.ac1    ? parseInt(a.ac1)     : 0,
      });
      if (availErr) { showToast("Seat avail failed: " + availErr.message, false); setAdding(false); fetchTrains(); return; }
    }

    showToast("Train added!");
    setForm(emptyForm);
    setStops([{ ...emptyStop }]);
    setAvails([{ ...emptyAvail }]);
    setShowForm(false);
    fetchTrains();
    setAdding(false);
  };

  const toggle = (day: string) => {
    const current = form.train_running_days ? form.train_running_days.split(",").map(d => d.trim()).filter(Boolean) : [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    setForm(f => ({ ...f, train_running_days: updated.join(",") }));
  };

  /* ── DASHBOARD ── */
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage:"radial-gradient(circle,rgba(249,115,22,0.06) 1px,transparent 1px)", backgroundSize:"40px 40px" }} />
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl font-mono text-sm border ${
              toast.ok ? "bg-card border-green-500/40 text-green-400" : "bg-card border-red-500/40 text-red-400"}`}>
            {toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-black font-mono tracking-tight">NEXRAIL ADMIN</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/database"
              className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
              DB Terminal
            </Link>
            <button onClick={() => navigate("/login")}
              className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-red-400 transition-colors">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 relative z-10 max-w-5xl">

        {/* Title + Add button */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black font-mono tracking-tighter text-foreground/80">TRAIN</h1>
            <h1 className="text-4xl font-black font-mono tracking-tighter text-primary -mt-1">MANAGEMENT</h1>
          </div>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-mono text-xs font-black tracking-widest hover:bg-primary/90 transition-all">
            <Plus className="h-4 w-4" /> ADD TRAIN
          </button>
        </div>

        {/* Add Train Form */}
        <AnimatePresence>
          {showForm && (
            <motion.form onSubmit={handleAdd}
              initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
              className="overflow-hidden mb-8">
              <div className="bg-card border border-primary/30 rounded-2xl p-6 shadow-xl space-y-5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-4">New Train Details</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Train No *</label>
                    <input type="number" required value={form.train_no} onChange={e => setForm(f => ({ ...f, train_no: e.target.value }))}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-primary transition-colors"
                      placeholder="12301" />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Train Name *</label>
                    <input required value={form.train_name} onChange={e => setForm(f => ({ ...f, train_name: e.target.value }))}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-primary transition-colors"
                      placeholder="Rajdhani Express" />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Train Type</label>
                    <select value={form.train_type} onChange={e => setForm(f => ({ ...f, train_type: e.target.value }))}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-primary transition-colors">
                      {TRAIN_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Distance (km)</label>
                    <input type="number" value={form.distance} onChange={e => setForm(f => ({ ...f, distance: e.target.value }))}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-primary transition-colors"
                      placeholder="1400" />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Source Station</label>
                    <select value={form.source_station_id} onChange={e => setForm(f => ({ ...f, source_station_id: e.target.value }))}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-primary transition-colors">
                      <option value="">— Select —</option>
                      {stations.map(s => (
                        <option key={s.station_code} value={s.station_code}>{s.station_name} ({s.station_code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Destination Station</label>
                    <select value={form.destination_station_id} onChange={e => setForm(f => ({ ...f, destination_station_id: e.target.value }))}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-primary transition-colors">
                      <option value="">— Select —</option>
                      {stations.map(s => (
                        <option key={s.station_code} value={s.station_code}>{s.station_name} ({s.station_code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Day toggles */}
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Runs On</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map(d => {
                      const active = form.train_running_days.split(",").map(x => x.trim()).includes(d);
                      return (
                        <button key={d} type="button" onClick={() => toggle(d)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary border-border text-muted-foreground hover:border-primary/40"}`}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Route stops */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Route Stops (in order)</label>
                    <button type="button" onClick={() => setStops(s => [...s, { ...emptyStop }])}
                      className="text-[9px] font-mono text-primary hover:underline flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Add Stop
                    </button>
                  </div>
                  <div className="space-y-2">
                    {stops.map((stop, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_90px_28px] gap-2 items-center">
                        <select value={stop.via_station_code}
                          onChange={e => setStops(s => s.map((x, j) => j === i ? { ...x, via_station_code: e.target.value } : x))}
                          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-primary transition-colors">
                          <option value="">— Station —</option>
                          {stations.map(s => (
                            <option key={s.station_code} value={s.station_code}>{s.station_name} ({s.station_code})</option>
                          ))}
                        </select>
                        <input type="number" placeholder="km" value={stop.km_from_origin}
                          onChange={e => setStops(s => s.map((x, j) => j === i ? { ...x, km_from_origin: e.target.value } : x))}
                          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-primary transition-colors" />
                        <input type="time" value={stop.reach_time}
                          onChange={e => setStops(s => s.map((x, j) => j === i ? { ...x, reach_time: e.target.value } : x))}
                          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-primary transition-colors" />
                        <button type="button" onClick={() => setStops(s => s.filter((_, j) => j !== i))}
                          disabled={stops.length === 1}
                          className="flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-30">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seat Availability */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Seat Availability (per date)</label>
                    <button type="button" onClick={() => setAvails(a => [...a, { ...emptyAvail }])}
                      className="text-[9px] font-mono text-primary hover:underline flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Add Date
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mb-1 px-1">
                    {["Date","Sleeper","3AC","2AC","1AC"].map(h => (
                      <span key={h} className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">{h}</span>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {avails.map((a, i) => (
                      <div key={i} className="grid grid-cols-[1fr_70px_70px_70px_70px_28px] gap-2 items-center">
                        <input type="date" value={a.journey_date}
                          onChange={e => setAvails(av => av.map((x, j) => j === i ? { ...x, journey_date: e.target.value } : x))}
                          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-primary transition-colors" />
                        {(["sleeper","ac3","ac2","ac1"] as const).map(field => (
                          <input key={field} type="number" min="0" placeholder="0" value={a[field]}
                            onChange={e => setAvails(av => av.map((x, j) => j === i ? { ...x, [field]: e.target.value } : x))}
                            className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary transition-colors" />
                        ))}
                        <button type="button" onClick={() => setAvails(av => av.filter((_, j) => j !== i))}
                          disabled={avails.length === 1}
                          className="flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-30">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={adding}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-mono text-xs font-black tracking-widest hover:bg-primary/90 transition-all disabled:opacity-60">
                    {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {adding ? "ADDING…" : "ADD TRAIN"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); setStops([{ ...emptyStop }]); setAvails([{ ...emptyAvail }]); }}
                    className="px-6 py-2.5 border border-border rounded-xl font-mono text-xs font-black tracking-widest text-muted-foreground hover:border-primary/40 transition-all">
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Train list */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-primary font-mono text-sm">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading trains…
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[80px_1fr_130px_100px_56px] gap-4 px-4 mb-2">
              {["NO.", "NAME", "TYPE", "ROUTE", ""].map((h, i) => (
                <span key={i} className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{h}</span>
              ))}
            </div>
            {trains.length === 0 && (
              <div className="text-center py-20 text-muted-foreground font-mono text-sm">No trains found.</div>
            )}
            {trains.map((t, i) => (
              <motion.div key={t.train_no}
                initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[80px_1fr_130px_100px_56px] gap-4 items-center bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-colors">
                <span className="font-black font-mono text-primary text-sm">{t.train_no}</span>
                <div>
                  <p className="font-bold font-mono text-sm text-foreground truncate">{t.train_name}</p>
                  {t.train_running_days && (
                    <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{t.train_running_days}</p>
                  )}
                </div>
                <span className="text-xs font-mono text-muted-foreground">{t.train_type}</span>
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {t.source_station_id && t.destination_station_id
                    ? `${t.source_station_id} → ${t.destination_station_id}`
                    : "—"}
                </span>
                <button onClick={() => handleDelete(t.train_no)} disabled={deleting === t.train_no}
                  className="flex items-center justify-center h-8 w-8 rounded-lg border border-border text-muted-foreground hover:border-red-500/60 hover:text-red-400 transition-all disabled:opacity-40">
                  {deleting === t.train_no ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
