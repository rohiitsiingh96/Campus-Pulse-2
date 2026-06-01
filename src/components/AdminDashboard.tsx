import React, { useState, useEffect } from "react";
import { X, Trash2, AlertTriangle, ShieldCheck, Clock, Mail, Calendar, Package, MapPin, Pin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Report {
  id: number;
  postId: number;
  reason: string;
  reporterEmail: string;
  createdAt: string;
}

interface AdminPost {
  id: number;
  type: "event" | "lost_found";
  title: string;
  organizer?: string;
  location: string;
  description: string;
  poster?: string;
  eventDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  registrationLink?: string;
  status?: "lost" | "found";
  contactNumber?: string;
  authorEmail: string;
  createdAt: string;
  isPinned?: number;
  reports: Report[];
  reportCount: number;
}

export const AdminDashboard = ({ onClose }: { onClose: () => void }) => {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/posts", {
      headers: { "Authorization": "admin-secret" }
    })
      .then(res => res.json())
      .then(data => {
        setPosts(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch posts", err);
        setIsLoading(false);
      });
  }, []);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deletePost = (postId: number) => {
    fetch(`/api/admin/posts/${postId}`, {
      method: "DELETE",
      headers: { "Authorization": "admin-secret" }
    }).then(() => {
      setPosts(posts.filter(p => p.id !== postId));
      setDeleteId(null);
    });
  };

  const togglePin = (postId: number, currentStatus: boolean) => {
    fetch(`/api/admin/posts/${postId}/pin`, {
      method: "PATCH",
      headers: { 
        "Authorization": "admin-secret",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ isPinned: !currentStatus })
    }).then(res => {
      if (res.ok) {
        setPosts(posts.map(p => p.id === postId ? { ...p, isPinned: currentStatus ? 0 : 1 } : p));
      }
    });
  };

  const [isTestingPush, setIsTestingPush] = useState(false);

  const sendTestPush = async () => {
    setIsTestingPush(true);
    try {
      const res = await fetch("/test-push");
      const data = await res.json();
      if (res.ok) {
        alert(`Test push sent successfully to ${data.results.success} subscribers!`);
      } else {
        alert("Failed to send test push.");
      }
    } catch (err) {
      alert("Network error while sending test push.");
    } finally {
      setIsTestingPush(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
      {deleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-md shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Are you sure?</h3>
            <div className="flex gap-4">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md text-sm font-bold text-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={() => deletePost(deleteId)} className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-bold shadow-lg shadow-red-500/20">Delete</button>
            </div>
          </div>
        </div>
      )}
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
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Admin Dashboard</h2>
              <p className="text-[10px] font-bold text-cu-red uppercase tracking-widest">Content Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto scrollbar-hide flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-cu-red rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Posts...</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={post.id}
                  className={cn(
                    "p-6 rounded-md border transition-all duration-300 flex flex-col sm:flex-row gap-6",
                    post.reportCount > 0 
                      ? "bg-cu-red-light dark:bg-red-900/10 border-cu-red shadow-sm" 
                      : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-cu-red"
                  )}
                >
                  {/* Post Image */}
                  <div className="w-full sm:w-32 h-32 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                    {post.poster ? (
                      <img src={post.poster} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                        {post.type === "event" ? <Calendar className="w-8 h-8" /> : <Package className="w-8 h-8" />}
                      </div>
                    )}
                  </div>

                  {/* Post Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {post.reportCount > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-red-200 dark:border-red-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {post.reportCount} Report{post.reportCount > 1 ? 's' : ''}
                            </span>
                          )}
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border flex items-center gap-1",
                            post.type === "event" 
                              ? "bg-cu-red-light dark:bg-red-900/20 text-cu-red border-cu-red/20"
                              : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800"
                          )}>
                            {post.type === "event" ? "Event" : "Lost & Found"}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
                          {post.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePin(post.id, !!post.isPinned)}
                          className={cn(
                            "p-2 rounded-md transition-all",
                            post.isPinned 
                              ? "bg-cu-red text-white" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-cu-red hover:bg-cu-red-light"
                          )}
                          title={post.isPinned ? "Unpin Post" : "Pin Post"}
                        >
                          <Pin className={cn("w-5 h-5", post.isPinned && "fill-current")} />
                        </button>
                        <button
                          onClick={() => setDeleteId(post.id)}
                          className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                          title="Delete Post"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5 uppercase">
                        <Mail className="w-3.5 h-3.5" />
                        {post.authorEmail}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {post.location}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {format(parseISO(post.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>

                    {/* Reports List */}
                    {post.reportCount > 0 && (
                      <div className="mt-4 bg-red-50 dark:bg-red-900/10 rounded-xl p-3 border border-red-100 dark:border-red-900/20 space-y-2">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Report Details</p>
                        {post.reports.map((report) => (
                          <div key={report.id} className="text-xs text-slate-700 dark:text-slate-300 flex gap-2">
                            <span className="font-bold text-red-500">•</span>
                            <span>
                              <span className="font-semibold">"{report.reason}"</span>
                              <span className="text-slate-400 dark:text-slate-500 ml-1">- {report.reporterEmail}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800">
                <Package className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-900 dark:text-slate-100 font-black uppercase tracking-widest text-sm">No Posts Found</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 font-medium">The feed is currently empty.</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={sendTestPush}
            disabled={isTestingPush}
            className="flex items-center gap-2 px-4 py-2 bg-cu-red hover:opacity-90 disabled:bg-slate-400 text-white rounded-md text-xs font-bold transition-all shadow-lg shadow-cu-red/20"
          >
            <ShieldCheck className="w-4 h-4" />
            {isTestingPush ? "Sending..." : "Send Test Notification"}
          </button>
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Confidential Admin Access • Campus Pulse Security
          </p>
        </div>
      </motion.div>
    </div>
  );
};
