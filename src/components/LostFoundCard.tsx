import React, { useState, useEffect } from "react";
import { Package, MapPin, Clock, Phone, Mail, Share2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Post } from "../types";

interface LostFoundCardProps {
  item: Post;
  onReport: (postId: number) => void;
}

export const LostFoundCard: React.FC<LostFoundCardProps> = ({ item, onReport }) => {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden transition-all hover:shadow-2xl"
    >
      <div className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm
            ${item.status === 'found' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}
          `}>
            {item.status || "Lost"}
          </span>
          <button 
            onClick={() => onReport(item.id)}
            className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 line-clamp-1 tracking-tight">
          {item.title}
        </h3>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-3 leading-relaxed flex-grow">
          {item.description}
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <MapPin className="w-4 h-4 text-cu-red" />
            <span className="line-clamp-1">{item.location}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <Clock className="w-4 h-4 text-cu-red" />
            <span>{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Phone className="w-4 h-4 text-cu-red" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {item.contactNumber || "No contact"}
            </span>
          </div>
          <button className="p-2 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-cu-red transition-all">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
};
