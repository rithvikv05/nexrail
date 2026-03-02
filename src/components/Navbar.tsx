import { Train, User, Menu, X, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const navLinks = [
  { label: "Book Tickets", to: "/" },
  { label: "PNR Status",  to: "/pnr-status" },
  { label: "Train Schedule", to: "/train-schedule" },
  { label: "Database",      to: "/database" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate("/");
    setMobileOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md border-b shadow-sm py-2"
          : "bg-background/80 backdrop-blur-md border-b border-border py-3"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 group flex-1">
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Train className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Nex<span className="text-primary">Rail</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors hover:text-primary relative group text-muted-foreground ${location.pathname === link.to ? "text-primary font-semibold" : ""}`}
            >
              {link.label}
              <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full ${
                location.pathname === link.to ? "w-full" : ""
              }`} />
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user ? (
            <>
              <Link to="/profile">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-foreground"
                >
                  <User className="h-4 w-4 mr-2" />
                  {user.name}
                </Button>
              </Link>
              <Button 
                size="sm"
                variant="outline"
                onClick={handleLogout}
                className=""
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/profile">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-foreground"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Link to="/login">
                <Button 
                  size="sm"
                  className=""
                >
                  Login
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            className="p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="text-foreground" /> : <Menu className="text-foreground" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-foreground font-medium py-2 border-b border-border/50"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex gap-4 mt-4">
                {user ? (
                  <>
                    <Link to="/profile" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full"><User className="h-4 w-4 mr-2" />{user.name}</Button>
                    </Link>
                    <Button className="flex-1" variant="destructive" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
                  </>
                ) : (
                  <>
                    <Link to="/profile" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full">Profile</Button>
                    </Link>
                    <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full">Login</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
