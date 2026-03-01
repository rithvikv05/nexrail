import { useLocation, Link } from "react-router-dom";
import { Train, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center px-4"
      >
        <motion.div 
          animate={{ x: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block mb-6"
        >
           <Train size={120} className="text-zinc-800" />
        </motion.div>
        
        <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-800 leading-none">
          404
        </h1>
        <h2 className="text-2xl font-bold mt-4 mb-2">Off the Rails?</h2>
        <p className="text-white/50 max-w-md mx-auto mb-8">
          The station you are looking for ({location.pathname}) seems to have disappeared from our map.
        </p>

        <Link to="/">
          <Button className="bg-white text-black hover:bg-white/90 font-bold px-8 py-6 rounded-full text-lg shadow-xl shadow-white/10 transition-all hover:scale-105">
            <Home className="mr-2 h-5 w-5" /> Return Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
