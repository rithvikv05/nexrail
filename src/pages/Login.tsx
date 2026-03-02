import { useState } from "react";
import { Train, User, Phone, Mail, ArrowRight, Lock, Hash, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo: string | undefined = location.state?.returnTo;
  const returnBookingState = location.state?.bookingState;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        // Check if email already exists
        const { data: existsData } = await supabase.rpc("check_email_exists", { p_email: email });
        if (existsData) {
          setError("An account with this email already exists. Please log in.");
          setLoading(false);
          return;
        }
        // Register user
        await supabase.rpc("register_user", {
          p_name: name,
          p_age: parseInt(age),
          p_gender: gender || "O",
          p_phone: phone,
          p_email: email,
          p_password: password,
        });
        // After register, log in to get user_id
        const { data: loginData, error: loginErr } = await supabase.rpc("login_user", {
          p_email: email,
          p_password: password,
        });
        if (loginErr || !loginData?.[0]) {
          setError("Account created! Please log in.");
          setMode("login");
          setLoading(false);
          return;
        }
        const u = loginData[0];
        setUser({ user_id: u.user_id, name: u.name, email: u.email });
        if (returnTo) { navigate(returnTo, { state: returnBookingState }); return; }
        navigate("/");
      } else {
        const { data: loginData, error: loginErr } = await supabase.rpc("login_user", {
          p_email: email,
          p_password: password,
        });
        if (loginErr || !loginData?.[0]) {
          setError("Invalid email or password. Please try again.");
          setLoading(false);
          return;
        }
        const u = loginData[0];
        setUser({ user_id: u.user_id, name: u.name, email: u.email });
        if (returnTo) { navigate(returnTo, { state: returnBookingState }); return; }
        navigate(email.toLowerCase() === "admin@gmail.com" ? "/admin" : "/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("reset_password", {
        p_email: email,
        p_new_password: newPassword,
      });
      if (rpcErr || !data) {
        setError("No account found with that email address.");
      } else {
        setSuccessMsg("Password updated! You can now log in.");
        setTimeout(() => {
          setMode("login");
          setSuccessMsg("");
          setNewPassword("");
          setConfirmPassword("");
        }, 2000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 overflow-hidden bg-background">

      {/* ── LEFT PANEL ── */}
      <div className="relative hidden lg:flex flex-col justify-start gap-10 p-14 overflow-hidden bg-background">
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(249,115,22,0.08),transparent_70%)]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse,rgba(234,88,12,0.06),transparent_70%)]" />
        </div>

        {/* Top: logo */}
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Train className="h-6 w-6" />
            </div>
            <span className="font-black font-mono text-foreground text-xl tracking-wider">NEXRAIL</span>
          </Link>
        </div>

        {/* Middle: stencil */}
        <div className="relative z-10">
          {/* LED blinkers */}
          <div className="flex items-center gap-3 mb-10">
            {[0, 0.15, 0.3].map((d, i) => (
              <motion.div key={i} animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
            ))}
            <div className="flex-1 h-px bg-primary/20" />
            <span className="text-primary/40 text-xs font-mono uppercase tracking-widest">LOGIN.PAGE</span>
          </div>

          <h1 className="text-[5rem] xl:text-[7rem] font-black leading-none tracking-tighter text-foreground/80 font-mono select-none">NEX</h1>
          <h1 className="text-[5rem] xl:text-[7rem] font-black leading-none tracking-tighter text-primary font-mono select-none -mt-3">RAIL</h1>

          <p className="text-muted-foreground font-mono text-sm mt-8 max-w-xs leading-relaxed">
            India's next-generation railway platform. Fast, secure, and built for millions.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-10">
            {[["10M+", "Passengers"], ["1000+", "Routes"], ["24/7", "Live Support"], ["99.9%", "Uptime"]].map(([v, l]) => (
              <div key={l} className="border border-border bg-card rounded-xl px-4 py-3 shadow-sm">
                <p className="font-black font-mono text-primary text-xl">{v}</p>
                <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── RIGHT PANEL (Form) ── */}
      <div className="relative flex items-start justify-center p-6 pt-16 lg:p-14 lg:pt-20 bg-background">
        {/* Subtle dot grid on right too */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="w-full max-w-md space-y-4 relative z-10">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Train className="h-5 w-5" />
            </div>
            <span className="font-black font-mono text-foreground text-lg">NEXRAIL</span>
          </Link>

          {/* Booking redirect banner */}
          {returnTo === "/book" && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-xs font-mono flex items-start gap-2">
              <span className="mt-0.5">🔒</span>
              <span>You need to log in to book a ticket. Log in below and you'll be taken straight to payment.</span>
            </div>
          )}

          {/* Heading */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              {mode === "login" ? "Welcome back" : "Create account"}
            </p>
            <h2 className="text-3xl font-black text-foreground font-mono">
              {mode === "login" ? "LOG IN" : "SIGN UP"}
            </h2>
          </motion.div>

          {/* Mode toggle */}
          {mode !== "forgot" && (
          <div className="relative flex border border-border rounded-xl p-0.5 bg-secondary">
            <div
              className="absolute top-0.5 bottom-0.5 bg-card border border-border rounded-[10px] shadow-sm"
              style={{
                width: "calc(50% - 4px)",
                left: "2px",
                transform: mode === "login" ? "translateX(0)" : "translateX(calc(100% + 4px))",
                transition: "transform 0.4s cubic-bezier(0.34,1.2,0.64,1)",
              }}
            />
            <button onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2.5 text-xs font-black font-mono uppercase tracking-widest relative z-10 transition-colors ${mode === "login" ? "text-foreground" : "text-muted-foreground"}`}>
              Log In
            </button>
            <button onClick={() => { setMode("signup"); setError(""); }}
              className={`flex-1 py-2.5 text-xs font-black font-mono uppercase tracking-widest relative z-10 transition-colors ${mode === "signup" ? "text-foreground" : "text-muted-foreground"}`}>
              Sign Up
            </button>
          </div>
          )}

          {/* ── Forgot Password Form ── */}
          {mode === "forgot" && (
            <form className="space-y-3" onSubmit={handleForgotPassword}>
              <div>
                <button type="button" onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
                  className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors flex items-center gap-1 mb-4">
                  ← Back to log in
                </button>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Reset password</p>
                <h2 className="text-3xl font-black text-foreground font-mono">FORGOT?</h2>
              </div>

              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-mono">{error}</div>}
              {successMsg && <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-mono">{successMsg}</div>}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="REGISTERED EMAIL"
                  className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm tracking-wide transition-all" />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                  placeholder="NEW PASSWORD"
                  className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm tracking-wide transition-all" />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                  placeholder="CONFIRM PASSWORD"
                  className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm tracking-wide transition-all" />
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                type="submit" disabled={loading}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 font-mono tracking-widest uppercase text-sm transition-all">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Reset Password <ArrowRight className="h-4 w-4" /></>}
              </motion.button>
            </form>
          )}

          {mode !== "forgot" && (
          <form className="space-y-3" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-mono">
                {error}
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {mode === "signup" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                  {/* Name */}
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required
                      placeholder="FULL NAME"
                      className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm tracking-wide transition-all" />
                  </div>
                  {/* Age + Gender */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative group">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input type="number" min={1} max={120} value={age} onChange={e => setAge(e.target.value)} required
                        placeholder="AGE"
                        className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm tracking-wide transition-all" />
                    </div>
                    <select value={gender} onChange={e => setGender(e.target.value)}
                      className="w-full bg-transparent border border-border rounded-xl py-3.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm appearance-none transition-all [&>option]:bg-background">
                      <option value="">GENDER</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                  {/* Phone */}
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                      placeholder="PHONE NUMBER"
                      className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm tracking-wide transition-all" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="EMAIL ADDRESS"
                className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm tracking-wide transition-all" />
            </div>

            {/* Password */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="PASSWORD"
                className="w-full bg-transparent border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm tracking-wide transition-all" />
            </div>

            {mode === "login" && (
              <div className="flex justify-end">
                <button type="button" onClick={() => { setMode("forgot"); setError(""); }}
                  className="text-xs text-primary font-mono hover:underline">Forgot password?</button>
              </div>
            )}

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              type="submit" disabled={loading}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 font-mono tracking-widest uppercase text-sm transition-all">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{mode === "login" ? "Log In" : "Create Account"} <ArrowRight className="h-4 w-4" /></>}
            </motion.button>
          </form>

          )}

          <p className="text-center text-xs text-muted-foreground font-mono">
            By continuing you agree to our{" "}
            <a href="#" className="text-foreground hover:text-primary transition-colors">Terms</a> &{" "}
            <a href="#" className="text-foreground hover:text-primary transition-colors">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
