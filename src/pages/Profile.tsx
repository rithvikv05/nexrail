import { useState, useEffect } from "react";
import { User, Ticket, LogOut, Settings, Loader2, Lock, ChevronDown, Train, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface Booking {
  pnr_no: number;
  train_name: string;
  from_station_name: string;
  to_station_name: string;
  booking_status: string;
  payment_date: string | null;
}

type Tab = "Personal Info" | "My Bookings" | "Settings";

interface PnrDetail {
  pnr_no: number;
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

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("Personal Info");
  const [profile, setProfile] = useState({ name: user?.name || "", phone: "", age: "", gender: "", email: user?.email || "" });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const load = async () => {
      setLoading(true);
      // Load profile
      const { data: pd } = await supabase.rpc("get_user_profile", { p_user_id: user.user_id });
      const p = pd?.[0];
      setProfile({
        name: p?.name || user.name || "",
        phone: p?.phone || "",
        age: p?.age != null ? String(p.age) : "",
        gender: p?.gender || "",
        email: p?.email || user.email || "",
      });
      // Load bookings
      const { data: bd } = await supabase.rpc("fetch_user_reservations", { user_code: user.user_id });
      setBookings((bd || []).slice().sort((a: Booking, b: Booking) => {
        if (!a.payment_date) return 1;
        if (!b.payment_date) return -1;
        return new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime();
      }));
      setLoading(false);
    };
    load();
  }, [user, navigate]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSaving(true);
    setMsg("");
    const { error } = await supabase.rpc("update_user_profile", {
      p_user_id: user.user_id,
      p_name: profile.name,
      p_phone: profile.phone,
      p_age: parseInt(profile.age) || 0,
      p_gender: profile.gender,
    });
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Profile updated successfully!");
  };

  const handleChangePassword = async () => {
    if (!user || !newPassword) return;
    setPwMsg("");
    const { error } = await supabase.rpc("change_password", { p_user_id: user.user_id, p_new_password: newPassword });
    setPwMsg(error ? `Error: ${error.message}` : "Password changed successfully!");
    if (!error) setNewPassword("");
  };

  const [expandedPnr, setExpandedPnr] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, PnrDetail[]>>({});
  const [detailLoading, setDetailLoading] = useState<number | null>(null);

  const handleExpand = async (pnr: number) => {
    if (expandedPnr === pnr) { setExpandedPnr(null); return; }
    setExpandedPnr(pnr);
    if (detailCache[pnr]) return;
    setDetailLoading(pnr);
    const { data } = await supabase.rpc("get_pnr_details", { pnr_number: pnr });
    setDetailCache(prev => ({ ...prev, [pnr]: data || [] }));
    setDetailLoading(null);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    const { error } = await supabase.rpc("delete_user", { p_user_id: user.user_id });
    if (error) { setPwMsg("Error: " + error.message); setDeleting(false); setDeleteConfirm(false); return; }
    logout();
    navigate("/");
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const initials = profile.name ? profile.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : user?.name?.slice(0, 2).toUpperCase() || "??";
  const statusColor = (s: string) => s === "Confirmed" ? "text-green-500" : s === "Cancelled" ? "text-red-500" : "text-yellow-500";

  const tabs: { icon: React.ElementType; label: Tab }[] = [
    { icon: User, label: "Personal Info" },
    { icon: Ticket, label: "My Bookings" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse,rgba(249,115,22,0.07),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(234,88,12,0.05),transparent_70%)]" />
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.08) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <main className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[300px_1fr] gap-8">
            {/* Sidebar */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
              <div className="bg-card border rounded-3xl p-6 shadow-xl text-center">
                <div className="relative inline-block mb-4">
                  <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto border-4 border-card text-primary text-3xl font-bold">
                    {initials}
                  </div>
                  <div className="absolute bottom-1 right-1 h-5 w-5 bg-green-500 rounded-full border-4 border-card" />
                </div>
                <h2 className="text-xl font-bold">{profile.name || user?.name}</h2>
                <p className="text-muted-foreground text-sm">{profile.email || user?.email}</p>
                <div className="grid grid-cols-2 gap-2 mt-6 pt-6 border-t">
                  <div className="text-center">
                    <div className="font-bold text-lg">{bookings.length}</div>
                    <div className="text-[10px] uppercase text-muted-foreground font-bold">Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg">₹{bookings.filter(b => b.booking_status === "Confirmed").length * 0}</div>
                    <div className="text-[10px] uppercase text-muted-foreground font-bold">Paid</div>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-3xl overflow-hidden shadow-lg">
                <div className="p-4 bg-muted/30 font-semibold text-sm">Menu</div>
                <div className="flex flex-col">
                  {tabs.map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      onClick={() => setActiveTab(label)}
                      className={`flex items-center gap-3 px-6 py-4 hover:bg-secondary/50 transition-colors text-sm font-medium text-left ${activeTab === label ? "bg-secondary text-primary" : ""}`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-6 py-4 hover:bg-red-500/10 hover:text-red-500 transition-colors text-sm font-medium text-left border-t text-muted-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-6">
              
              {/* Stats */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <p className="text-muted-foreground text-xs uppercase font-bold">Total Bookings</p>
                  <p className="text-3xl font-bold mt-2">{bookings.length}</p>
                </div>
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <p className="text-muted-foreground text-xs uppercase font-bold">Status</p>
                  <p className="text-3xl font-bold mt-2">{bookings.filter(b => b.booking_status === "Confirmed").length} Confirmed</p>
                </div>
              </div>

              {/* Personal Info Tab */}
              {activeTab === "Personal Info" && (
                <div className="bg-card border rounded-3xl p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Personal Information</h3>
                  {msg && (
                    <div className={`mb-4 p-3 rounded-xl text-sm ${msg.startsWith("Error") ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
                      {msg}
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    {[
                      { label: "Full Name", key: "name", type: "text", placeholder: "Your name" },
                      { label: "Email", key: "email", type: "email", placeholder: "your@email.com", readonly: true },
                      { label: "Phone", key: "phone", type: "tel", placeholder: "Phone number" },
                      { label: "Age", key: "age", type: "number", placeholder: "Age" },
                    ].map(({ label, key, type, placeholder, readonly }) => (
                      <div key={key} className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">{label}</label>
                        <input
                          type={type}
                          value={profile[key as keyof typeof profile]}
                          onChange={e => !readonly && setProfile(p => ({ ...p, [key]: e.target.value }))}
                          readOnly={readonly}
                          placeholder={placeholder}
                          className={`w-full p-3 bg-secondary rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${readonly ? "opacity-60 cursor-not-allowed" : ""}`}
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Gender</label>
                      <select
                        value={profile.gender}
                        onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}
                        className="w-full p-3 bg-secondary rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                      >
                        <option value="">Select</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-8">
                    <Button onClick={handleUpdateProfile} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Update Profile
                    </Button>
                  </div>
                </div>
              )}

              {/* My Bookings Tab */}
              {activeTab === "My Bookings" && (
                <div className="bg-card border rounded-3xl p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">My Bookings</h3>
                    <span className="text-sm text-muted-foreground">{bookings.length} booking(s)</span>
                  </div>
                  {bookings.length === 0 ? (
                    <div className="border-dashed border-2 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                      <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="font-medium">No bookings found</p>
                      <p className="text-sm text-muted-foreground mb-4">Book your first train ticket!</p>
                      <Link to="/"><Button variant="outline" size="sm">Book a Ticket</Button></Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map((b) => {
                        const isOpen = expandedPnr === b.pnr_no;
                        const detail = detailCache[b.pnr_no];
                        const journey = detail?.[0];
                        const isConfirmed = b.booking_status === "Confirmed";
                        const isCancelled = b.booking_status === "Cancelled";
                        const stampColor = isConfirmed ? "border-green-500 text-green-500" : isCancelled ? "border-red-500 text-red-500" : "border-yellow-500 text-yellow-500";
                        const stampText = isConfirmed ? "CONFIRMED" : isCancelled ? "CANCELLED" : "WAITING";
                        return (
                          <div key={b.pnr_no} className="border rounded-2xl overflow-hidden">
                            {/* Row header */}
                            <button
                              onClick={() => handleExpand(b.pnr_no)}
                              className="w-full flex items-center gap-4 p-5 hover:bg-secondary/40 transition-colors text-left"
                            >
                              <div className="flex-1">
                                <p className="font-bold">{b.train_name || "Unknown Train"}</p>
                                <p className="text-sm text-muted-foreground">{b.from_station_name} → {b.to_station_name}</p>
                                <p className="text-xs font-mono text-muted-foreground mt-1">PNR: {b.pnr_no}</p>
                              </div>
                              <span className={`text-sm font-semibold ${statusColor(b.booking_status)}`}>{b.booking_status}</span>
                              {detailLoading === b.pnr_no
                                ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                                : <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />}
                            </button>

                            {/* Expanded ticket */}
                            {isOpen && (
                              <div className="border-t">
                                {!journey ? (
                                  <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                ) : (
                                  <div className="bg-[#fdfaf6] rounded-b-2xl overflow-hidden">
                                    {/* Ticket header */}
                                    <div className="bg-gradient-to-br from-orange-600 to-orange-800 px-8 pt-8 pb-6 relative overflow-hidden">
                                      <div className="absolute inset-0 opacity-10"
                                        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                                      <div className="flex items-start justify-between relative z-10">
                                        <div>
                                          <p className="text-orange-200 text-xs font-bold uppercase tracking-widest">NEXRAIL TICKET</p>
                                          <p className="text-white text-2xl font-black mt-1">{journey.train_name || `Train #${b.pnr_no}`}</p>
                                        </div>
                                        <div className={`border-2 rounded px-2 py-1 text-xs font-black tracking-widest ${stampColor} bg-white/10`}>{stampText}</div>
                                      </div>
                                      <div className="flex items-center gap-3 mt-4 relative z-10">
                                        <div>
                                          <p className="text-orange-200 text-[10px] font-bold uppercase">From</p>
                                          <p className="text-white text-lg font-black">{journey.from_station}</p>
                                        </div>
                                        <div className="flex-1 flex items-center gap-1">
                                          <div className="flex-1 h-px bg-white/30" />
                                          <Train className="h-4 w-4 text-white/70" />
                                          <div className="flex-1 h-px bg-white/30" />
                                        </div>
                                        <div className="text-right">
                                          <p className="text-orange-200 text-[10px] font-bold uppercase">To</p>
                                          <p className="text-white text-lg font-black">{journey.to_station}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Meta row */}
                                    <div className="px-8 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white border-b">
                                      {[
                                        { label: "PNR", val: String(journey.pnr_no), mono: true },
                                        { label: "Date", val: journey.from_date || "—" },
                                        { label: "Arrival", val: journey.to_date || "—" },
                                        { label: "Distance", val: journey.distance != null ? `${journey.distance} km` : "—" },
                                      ].map(f => (
                                        <div key={f.label}>
                                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{f.label}</p>
                                          <p className={`text-slate-800 font-bold text-sm ${f.mono ? "font-mono" : ""}`}>{f.val}</p>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Passenger rows */}
                                    <div className="px-8 py-4 bg-white space-y-3">
                                      <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-2">Passengers</p>
                                      {detail.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between border rounded-xl px-4 py-3">
                                          <div>
                                            <p className="font-bold text-sm text-slate-800">{r.pax_name}</p>
                                            <p className="text-xs text-slate-500">{r.pax_age} yrs · {r.pax_sex === "M" ? "Male" : r.pax_sex === "F" ? "Female" : "Other"}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-mono font-bold text-slate-700 text-sm">{r.seat_no || "—"}</p>
                                            <p className="text-orange-500 font-bold text-xs">₹{r.passenger_fare || "—"}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Payment strip */}
                                    <div className="bg-slate-800 px-8 py-4 flex items-center justify-between rounded-b-2xl">
                                      <div>
                                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Total Paid</p>
                                        <p className="text-white text-xl font-black">₹{journey.total_fare || "—"}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Mode</p>
                                        <p className="text-slate-200 text-sm font-mono">{journey.mode || "—"}</p>
                                        <p className="text-slate-500 text-xs font-mono truncate max-w-[160px]">{journey.transaction_number || "—"}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "Settings" && (
                <div className="bg-card border rounded-3xl p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Change Password</h3>
                  {pwMsg && (
                    <div className={`mb-4 p-3 rounded-xl text-sm ${pwMsg.startsWith("Error") ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
                      {pwMsg}
                    </div>
                  )}
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                    <Button onClick={handleChangePassword} disabled={!newPassword}>Change Password</Button>
                  </div>

                  {/* Danger Zone */}
                  <div className="mt-10 border border-red-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <h4 className="font-bold text-red-500">Danger Zone</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
                    {!deleteConfirm ? (
                      <button onClick={() => setDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-red-500/50 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-500/10 transition-colors">
                        <Trash2 className="h-4 w-4" /> Delete Account
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-red-500">Are you sure? This will permanently delete your account.</p>
                        <div className="flex gap-3">
                          <button onClick={handleDeleteAccount} disabled={deleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60">
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            {deleting ? "Deleting…" : "Yes, Delete"}
                          </button>
                          <button onClick={() => setDeleteConfirm(false)}
                            className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
