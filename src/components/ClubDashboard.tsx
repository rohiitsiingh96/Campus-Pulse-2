import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Calendar, Package, MapPin, Clock, Mail, BarChart3, Eye, Users } from "lucide-react";
import { motion } from "motion/react";
import { format, parseISO } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ClubPost {
  id: number;
  type: "event" | "lost_found";
  title: string;
  authorEmail: string;
  createdAt: string;
}

export const ClubDashboard = ({ onClose }: { onClose: () => void }) => {
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts")
      .then(res => res.json())
      .then(data => {
        const clubPosts = data.filter((p: any) => p.authorEmail === "csquare@cuchd.in");
        setPosts(clubPosts);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch posts", err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-white dark:bg-[#1f2937] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-700"
      >
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cu-red-light dark:bg-red-900/30 rounded-md flex items-center justify-center border border-cu-red/20">
              <ShieldCheck className="w-6 h-6 text-cu-red" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">CSQUARE Dashboard</h2>
              <p className="text-[10px] font-bold text-cu-red uppercase tracking-widest">Club Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto scrollbar-hide flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mb-8">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 min-w-0 flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-cu-red/50 group-hover:bg-cu-red transition-colors" />
              <div className="flex items-center gap-2 mb-2 opacity-70">
                <BarChart3 className="w-3.5 h-3.5 text-cu-red" />
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">Total Posts</p>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">{posts.length}</p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 min-w-0 flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 group-hover:bg-emerald-500 transition-colors" />
              <div className="flex items-center gap-2 mb-2 opacity-70">
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">Total Views</p>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">0</p>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 min-w-0 flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50 group-hover:bg-amber-500 transition-colors" />
              <div className="flex items-center gap-2 mb-2 opacity-70">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider break-words whitespace-normal">Registrations</p>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">0</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-cu-red rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Posts...</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="p-6 rounded-2xl border bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">{post.title}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{format(parseISO(post.createdAt), "MMM d, yyyy")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-sm">No posts yet.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
