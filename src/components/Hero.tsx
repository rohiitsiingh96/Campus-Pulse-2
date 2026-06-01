import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Calendar, Search } from "lucide-react";

export const Hero: React.FC = () => {
  const scrollToEvents = () => {
    const element = document.getElementById("events-section");
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative pt-20 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cu-red/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cu-red/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cu-red-light dark:bg-red-900/30 text-cu-red dark:text-red-400 text-xs font-bold uppercase tracking-widest mb-8 border border-cu-red/20 dark:border-red-500/20">
            <Calendar className="w-3.5 h-3.5" />
            Campus Life Reimagined
          </span>
          
          <h1 className="text-5xl lg:text-8xl font-black tracking-tighter text-slate-900 dark:text-white mb-6 leading-[0.9]">
            CAMPUS <span className="accent-text">PULSE</span>
          </h1>
          
          <h2 className="text-xl lg:text-3xl font-bold text-slate-700 dark:text-slate-300 mb-8 tracking-tight uppercase">
            Where events are found <span className="text-cu-red italic">before they expire</span>
          </h2>
          
          <p className="max-w-2xl mx-auto text-lg text-slate-500 dark:text-slate-400 mb-12 leading-relaxed">
            Discover technical fests, cultural nights, and sports meets. 
            Never miss a registration deadline again with our real-time campus tracker.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToEvents}
              className="w-full sm:w-auto px-8 py-4 bg-cu-red text-white rounded-md font-bold text-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-cu-red/20 flex items-center justify-center gap-2"
            >
              Explore Events
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search events, clubs..."
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:ring-2 focus:ring-cu-red outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
