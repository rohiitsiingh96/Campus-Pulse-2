import React, { useState } from "react";
import { X, Calendar, MapPin, Type, FileText, Link as LinkIcon, Phone, Mail, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PostType, EventCategory, EventMode } from "../types";

interface PostModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const PostModal: React.FC<PostModalProps> = ({ onClose, onSuccess }) => {
  const [type, setType] = useState<PostType>("event");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    organizer: "",
    location: "",
    description: "",
    poster: "",
    eventDate: "",
    endDate: "",
    registrationDeadline: "",
    registrationLink: "",
    status: "lost" as "lost" | "found",
    contactNumber: "",
    authorEmail: "",
    category: "other" as EventCategory,
    mode: "offline" as EventMode,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, type }),
      });
      
      if (response.ok) {
        onSuccess(`${type === 'event' ? 'Event' : 'Item'} posted successfully!`);
        onClose();
      }
    } catch (error) {
      console.error("Failed to post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Create Post</h2>
            <p className="text-xs font-bold text-cu-red uppercase tracking-widest mt-1">Share with the campus</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Type Selector */}
        <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
          <button
            onClick={() => setType("event")}
            className={`flex-1 py-3 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2
              ${type === "event" ? "bg-cu-red text-white shadow-lg shadow-cu-red/20" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"}
            `}
          >
            <Calendar className="w-4 h-4" />
            Campus Event
          </button>
          <button
            onClick={() => setType("lost_found")}
            className={`flex-1 py-3 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2
              ${type === "lost_found" ? "bg-cu-red text-white shadow-lg shadow-cu-red/20" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"}
            `}
          >
            <ImageIcon className="w-4 h-4" />
            Lost & Found
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto scrollbar-hide flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Title</label>
              <input
                required
                type="text"
                placeholder="e.g. Hackathon 2024"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-cu-red outline-none"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                {type === "event" ? "Organizer" : "Contact Number"}
              </label>
              <input
                required
                type="text"
                placeholder={type === "event" ? "Club/Department Name" : "Phone Number"}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-cu-red outline-none"
                value={type === "event" ? formData.organizer : formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, [type === "event" ? "organizer" : "contactNumber"]: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
            <textarea
              required
              rows={3}
              placeholder="Provide more details..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-cu-red outline-none resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Location</label>
              <input
                required
                type="text"
                placeholder="e.g. Main Auditorium"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-cu-red outline-none"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Your Email</label>
              <input
                required
                type="email"
                placeholder="college-email@cuchd.in"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-cu-red outline-none"
                value={formData.authorEmail}
                onChange={(e) => setFormData({ ...formData, authorEmail: e.target.value })}
              />
            </div>
          </div>

          {type === "event" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Event Date</label>
                <input
                  required
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-cu-red outline-none"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reg. Deadline</label>
                <input
                  required
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-cu-red outline-none"
                  value={formData.registrationDeadline}
                  onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full py-4 bg-cu-red text-white rounded-md font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cu-red/20"
            >
              {isSubmitting ? "Posting..." : "Create Post"}
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
