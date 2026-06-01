import React, { useState, useEffect } from "react";
import { Calendar, MapPin, User, Clock, ChevronRight, AlertCircle, Download, Share2 } from "lucide-react";
import { format, intervalToDuration, isAfter } from "date-fns";
import { motion } from "framer-motion";
import { Post } from "../types";

interface EventCardProps {
  event: Post;
  onViewDetails: (event: Post) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onViewDetails }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!event.registrationDeadline) return;
    
    const target = new Date(event.registrationDeadline);
    const update = () => {
      const now = new Date();
      if (isAfter(now, target)) {
        setTimeLeft("Registration Closed");
        setIsExpired(true);
        return;
      }

      const duration = intervalToDuration({ start: now, end: target });
      const parts = [];
      if (duration.days) parts.push(`${duration.days}d`);
      if (duration.hours) parts.push(`${duration.hours}h`);
      if (duration.minutes) parts.push(`${duration.minutes}m`);
      
      setTimeLeft(`Reg closes in: ${parts.slice(0, 2).join(" ")}`);
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [event.registrationDeadline]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1"
    >
      {/* Poster Image */}
      <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img 
          src={event.poster || `https://picsum.photos/seed/${event.id}/800/500`} 
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-cu-red text-[10px] font-black uppercase tracking-widest shadow-sm">
            {event.category || "General"}
          </span>
        </div>

        {/* Mode Badge */}
        <div className="absolute top-4 right-4">
          <span className={
            `px-3 py-1.5 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-widest shadow-sm
            ${event.mode === 'online' ? 'bg-emerald-500/90 text-white' : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400'}`
          }>
            {event.mode || "Offline"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          <User className="w-3 h-3" />
          <span className="line-clamp-1">{event.organizer || "Independent"}</span>
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 line-clamp-1 tracking-tight">
          {event.title}
        </h3>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <Calendar className="w-4 h-4 text-cu-red" />
            <span>{event.eventDate ? format(new Date(event.eventDate), "MMM d, yyyy") : "TBD"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <MapPin className="w-4 h-4 text-cu-red" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>

        {/* Registration Status */}
        {event.registrationDeadline && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-md mb-6 text-xs font-bold transition-colors
            ${isExpired ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' : 'bg-cu-red-light dark:bg-cu-red/20 text-cu-red'}
          `}>
            {isExpired ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {timeLeft}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <button 
            onClick={() => onViewDetails(event)}
            className="flex-1 btn-primary"
          >
            View Details
          </button>
          <button className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-cu-red transition-all">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.article>
  );
};
