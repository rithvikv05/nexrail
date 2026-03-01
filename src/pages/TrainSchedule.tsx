import { useState } from "react";
import { Search, Clock, Ruler, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
}

const TrainSchedule = () => {
  const [trainNo, setTrainNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<RouteStop[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!trainNo) return;
    setLoading(true);
    setError("");
    setSearched(false);
    const { data, error: err } = await supabase.rpc("get_train_schedule", { input_train_code: parseInt(trainNo) });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setRoute(data || []);
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
            <div>
              <motion.h1 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-4xl font-bold mb-2"
              >
                Train Timetable
              </motion.h1>
              <motion.p 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground"
              >
                Route, reach time, and distance for each station — from the <span className="font-mono text-xs bg-muted px-1 rounded">train_route</span> table
              </motion.p>
            </div>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card border rounded-2xl p-6 shadow-lg mb-10 flex flex-col md:flex-row gap-4"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input 
                type="number"
                value={trainNo}
                onChange={(e) => setTrainNo(e.target.value)}
                placeholder="Enter train number (train_code)..."
                className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border-0 font-mono"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="px-8" size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search Schedule"}
            </Button>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="border rounded-2xl overflow-hidden bg-card/50 backdrop-blur"
          >
            {error && (
              <div className="p-4 m-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {/* Columns match train_route exactly */}
            <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
              <div className="col-span-1">#</div>
              <div className="col-span-2">Code</div>
              <div className="col-span-4">Station Name</div>
              <div className="col-span-3 flex items-center gap-1"><Clock className="h-3 w-3" /> Reach Time</div>
              <div className="col-span-2 flex items-center gap-1"><Ruler className="h-3 w-3" /> Dist.</div>
            </div>
            
            <div className="divide-y divide-border/50">
              {!searched ? (
                <div className="p-10 text-center text-muted-foreground/40 italic">
                  Enter a train number to view its schedule
                </div>
              ) : route.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground italic">
                  No schedule found for train {trainNo}
                </div>
              ) : (
                route.map((stop, i) => (
                  <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3 text-sm hover:bg-secondary/30 transition-colors">
                    <div className="col-span-1 text-muted-foreground">{stop.stop_no ?? i + 1}</div>
                    <div className="col-span-2 font-mono text-xs">{stop.via_station_code || "—"}</div>
                    <div className="col-span-4 font-medium">
                      {stop.station_name || "—"}
                      {stop.city && <span className="text-xs text-muted-foreground ml-1">({stop.city})</span>}
                    </div>
                    <div className="col-span-3 font-mono">{stop.reach_time || "—"}</div>
                    <div className="col-span-2">{stop.km_from_origin ?? "—"}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrainSchedule;
