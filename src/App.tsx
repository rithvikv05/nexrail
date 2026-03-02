import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import PnrStatus from "./pages/PnrStatus";
import TrainSchedule from "./pages/TrainSchedule";
import Profile from "./pages/Profile";
import Book from "./pages/Book";
import TrainSearch from "./pages/TrainSearch";
import Database from "./pages/Database";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/trains" element={<TrainSearch />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pnr-status" element={<PnrStatus />} />
            <Route path="/train-schedule" element={<TrainSchedule />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/book" element={<Book />} />
            <Route path="/database" element={<Database />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
