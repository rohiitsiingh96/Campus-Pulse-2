import React, { useState, useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import { AdminDashboard } from "./components/AdminDashboard";
import { ClubDashboard } from "./components/ClubDashboard";
import { LostFoundIndicator } from "./components/LostFoundIndicator";
import { 
  Plus, 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  Search, 
  X, 
  Image as ImageIcon,
  AlertCircle,
  Package,
  Linkedin,
  Heart,
  Info,
  Filter, 
  ShieldCheck,
  Mail,
  CheckCircle2,
  Download,
  Sun,
  Moon,
  AlertTriangle,
  Pin,
  Eye,
  CircleDot,
  XCircle,
  ArrowRight
} from "lucide-react";
import { format, isAfter, isBefore, parseISO, intervalToDuration, addDays, subDays } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Utilities ---

const toTitleCase = (str: string) => {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

const downloadImage = async (imageUrl: string, fileName: string) => {
  try {
    const link = document.createElement('a');
    link.download = `${fileName.replace(/\s+/g, '_')}_poster.png`;

    // Handle Data URLs directly
    if (imageUrl.startsWith('data:')) {
      link.href = imageUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Handle remote URLs
    try {
      const response = await fetch(imageUrl, {
        mode: 'cors', // Try CORS first
      });
      if (!response.ok) throw new Error('Fetch failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (fetchErr) {
      console.warn("Fetch download failed, trying direct link...", fetchErr);
      // Fallback: Open in new tab if fetch fails (e.g. CORS)
      window.open(imageUrl, '_blank');
    }
  } catch (err) {
    console.error("Failed to download image", err);
    alert("Failed to download image. Opening in new tab instead.");
    window.open(imageUrl, '_blank');
  }
};

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Compress to 0.7 quality to target ~500KB
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

// --- Types ---

type PostType = "event" | "lost_found";

const formatEmail = (email: string) => {
  if (!email) return "";
  return email.toUpperCase();
};

interface Post {
  id: number;
  type: PostType;
  title: string;
  organizer?: string;
  location: string;
  description: string;
  poster?: string;
  eventDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  registrationLink?: string;
  status?: "lost" | "found" | "completed";
  contactNumber?: string;
  authorEmail: string;
  createdAt: string;
  completedAt?: string;
  isPinned?: number;
}

// --- Components ---

const StatusBadge = ({ type, deadline, status }: { type: 'event' | 'lost_found', deadline?: string, status?: string }) => {
  const now = new Date();
  
  if (type === 'event') {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-400/20">
          <XCircle className="w-3 h-3" /> Closed
        </span>
      );
    }
    
    if (deadline) {
      const target = new Date(deadline);
      const isExpired = isAfter(now, target);
      
      if (isExpired) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-400/20">
            <XCircle className="w-3 h-3" /> Registration Closed
          </span>
        );
      }
      
      const duration = intervalToDuration({ start: now, end: target });
      const isClosingSoon = !duration.years && !duration.months && !duration.days && (duration.hours || 0) < 24;
      
      if (isClosingSoon) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-400/20">
            <Clock className="w-3 h-3" /> Closing Soon
          </span>
        );
      }
    }
    
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-400/20">
        <CircleDot className="w-3 h-3" /> Open
      </span>
    );
  }
  
  // Lost & Found
  if (status === 'lost') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-400/20">
        <AlertTriangle className="w-3 h-3" /> Lost
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-400/20">
      <CheckCircle2 className="w-3 h-3" /> Found
    </span>
  );
};

const AppNotification = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
    className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] surface-card p-5 rounded-[1.5rem] shadow-2xl flex items-center gap-4 min-w-[320px] border border-slate-200 dark:border-white/10"
  >
    <div className="bg-cu-red rounded-xl p-2.5 shadow-lg shadow-cu-red/20 w-10 h-10 flex items-center justify-center overflow-hidden">
      <img 
        src="/logo.png" 
        alt="Logo" 
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "https://picsum.photos/seed/college-logo/128/128";
        }}
        referrerPolicy="no-referrer"
      />
    </div>
    <div className="flex-1">
      <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{message}</p>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Just now</p>
    </div>
    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
      <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
    </button>
  </motion.div>
);

const RegistrationCountdown = ({ deadline }: { deadline: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const target = new Date(deadline);
    
    const update = () => {
      const now = new Date();
      if (isAfter(now, target)) {
        setTimeLeft("Registration Closed");
        setIsExpired(true);
        return;
      }

      const duration = intervalToDuration({ start: now, end: target });
      const parts = [];
      if (duration.years) parts.push(`${duration.years}y`);
      if (duration.months) parts.push(`${duration.months}mo`);
      if (duration.days) parts.push(`${duration.days}d`);
      if (duration.hours) parts.push(`${duration.hours}h`);
      if (duration.minutes) parts.push(`${duration.minutes}m`);
      if (duration.seconds) parts.push(`${duration.seconds}s`);
      
      setTimeLeft(`Reg closes in: ${parts.slice(0, 2).join(" ")}`);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-[11px] font-bold",
      isExpired ? "text-zinc-400" : "text-red-500"
    )}>
      <Clock className="w-3.5 h-3.5" />
      <span>{timeLeft}</span>
    </div>
  );
};

const Sidebar = ({ isOpen, onClose, userEmail, setIsAdminOpen }: { isOpen: boolean; onClose: () => void; userEmail: string; setIsAdminOpen: (open: boolean) => void }) => {
  return (
    <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-md"
        />
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-r border-slate-200 dark:border-white/10"
        >
          <div className="p-8 flex-1">
            <div className="flex items-center justify-between mb-12">
              <div className="w-12 h-12 bg-cu-red rounded-md flex items-center justify-center shadow-xl shadow-cu-red/10 dark:shadow-none overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://picsum.photos/seed/college-logo/128/128";
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">About App</h3>
                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tighter mb-2">Campus Pulse</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  A real-time digital notice board for students to stay updated with campus events and find lost belongings before they disappear.
                </p>
              </div>

              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">Developer</h3>
                <div className="flex items-center gap-4 group">
                  <div className="w-14 h-14 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 group-hover:border-cu-red/30 transition-all duration-500">
                    <img 
                      src="https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&q=80&w=200" 
                      alt="Developer" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">Rohit Raj</p>
                    <a 
                      href="https://www.linkedin.com/in/rohit-raj-659b74277/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-cu-red dark:text-red-400 text-xs font-bold hover:opacity-80 transition-colors mt-1"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      Connect on LinkedIn
                    </a>
                  </div>
                </div>
                {userEmail === "admin@cuchd.in" && (
                  <button
                    onClick={() => setIsAdminOpen(true)}
                    className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 transition-all p-3 text-sm font-bold"
                    title="Admin Dashboard"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    Admin Dashboard
                  </button>
                )}
                {userEmail === "csquare@cuchd.in" && (
                  <button
                    onClick={() => setIsAdminOpen(true)}
                    className="mt-6 w-full flex items-center justify-center gap-2 rounded-md bg-cu-red text-white hover:opacity-90 transition-all p-3 text-sm font-bold shadow-lg shadow-cu-red/20"
                    title="Club Dashboard"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Club Dashboard
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-zinc-400">
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <p className="text-[8px] font-bold uppercase tracking-widest">
                Built because tracking events through 50+ WhatsApp groups is a nightmare. 📱🚫
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
};

const PostCard = ({ post, onClick, onReportClick }: { post: Post; onClick: () => void; onReportClick: (postId: number) => void }) => {
  const isEvent = post.type === "event";
  
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    return format(parseISO(dateStr), "MMM d, h:mm aa");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="group w-full text-left surface-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-cu-red/20 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cu-red/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
    >
      <div className="aspect-[16/10] relative bg-slate-800 overflow-hidden">
        {post.poster ? (
          <>
            <img 
              src={post.poster} 
              alt={post.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              referrerPolicy="no-referrer"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-900">
            <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 opacity-20 dark:opacity-10" />
          </div>
        )}

        {/* Top Left Badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1.5 sm:gap-2">
          {post.isPinned === 1 && (
            <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-widest bg-cu-red text-white shadow-lg border border-white/10 flex items-center gap-1 sm:gap-1.5">
              <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" /> Pinned
            </span>
          )}
          <span className={cn(
            "px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-widest shadow-lg backdrop-blur-md flex items-center gap-1 sm:gap-1.5 border border-white/10",
            isEvent ? "bg-red-500/90 text-white" : "bg-slate-900/90 text-white"
          )}>
            {isEvent ? <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Package className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            {isEvent ? "Event" : "Lost"}
          </span>
        </div>

        {/* Top Right View Icon (Affordance) */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 bg-white/10 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/10">
          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
        </div>

        {/* Report Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReportClick(post.id);
          }}
          className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-10 p-1.5 sm:p-2 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md rounded-lg text-red-200 opacity-0 group-hover:opacity-100 transition-all duration-300 border border-red-500/30"
          title="Report Post"
        >
          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>
      
      <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
        <div className="space-y-0.5 sm:space-y-1">
          <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-50 line-clamp-1 group-hover:text-cu-red transition-colors duration-300 tracking-tight">
            {post.title}
          </h3>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold text-cu-red">
             {isEvent && post.eventDate ? (
               <div className="flex items-center gap-1 sm:gap-1.5">
                 <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                 <span>{formatTime(post.eventDate)}</span>
               </div>
             ) : (
               <div className="flex items-center gap-1 sm:gap-1.5">
                 <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                 <span>{format(parseISO(post.createdAt), "MMM d, yyyy")}</span>
               </div>
             )}
          </div>
        </div>
        
        <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            {isEvent && (
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">{post.organizer}</span>
              </div>
            )}
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="truncate">
                {post.location.startsWith('http') ? "Maps" : toTitleCase(post.location)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-1 sm:pt-2 flex items-center justify-between">
          <StatusBadge 
            type={post.type} 
            deadline={post.registrationDeadline} 
            status={post.status} 
          />
        </div>
      </div>
    </motion.div>
  );
};

const Modal = ({ isOpen, onClose, title, disclaimer, children }: { isOpen: boolean; onClose: () => void; title: string; disclaimer?: string; children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-white/10"
        >
          <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-start justify-between gap-4 bg-slate-50/30 dark:bg-slate-900/30">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">{title}</h2>
              {disclaimer && (
                <p className="mt-3 flex w-full items-start gap-2.5 rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2.5 text-[11px] font-bold leading-relaxed text-red-900 shadow-sm shadow-red-500/20 dark:border-red-400 dark:bg-red-950/60 dark:text-red-100">
                  <AlertTriangle className="disclaimer-alert-icon mt-0.5 h-8 w-8 shrink-0" />
                  <span className="min-w-0">{disclaimer}</span>
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90">
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
          <div className="p-8 overflow-y-auto scrollbar-hide dark:bg-slate-900">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- Main App ---

export default function App() {
  console.log('App component is rendering');
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<PostType>("event");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("campus_pulse_theme");
      return savedTheme === "dark";
    } catch (e) {
      return false;
    }
  });

  const [isLostFoundSeen, setIsLostFoundSeen] = useState(() => {
    try {
      return localStorage.getItem("lostFoundSeen") === "true";
    } catch (e) {
      return false;
    }
  });

  const handleLostFoundClick = () => {
    setActiveTab("lost_found");
    if (!isLostFoundSeen) {
      setIsLostFoundSeen(true);
      localStorage.setItem("lostFoundSeen", "true");
    }
  };
  const [userEmail, setUserEmail] = useState(() => {
    try {
      return sessionStorage.getItem("campus_pulse_email") || "";
    } catch (e) {
      return "";
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Post>>({
    type: "event",
    title: "",
    organizer: "",
    location: "",
    description: "",
    poster: "",
    eventDate: "",
    endDate: "",
    registrationDeadline: "",
    registrationLink: "",
    status: "lost",
    contactNumber: ""
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("campus_pulse_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("campus_pulse_theme", "light");
      }
    } catch (e) {
      console.error("Failed to set theme in localStorage", e);
    }
  }, [isDarkMode]);

  useEffect(() => {
    const socket = io();
    fetchPosts();

    socket.on("new_post", (post: Post) => {
      setPosts(prev => prev.some(existingPost => existingPost.id === post.id)
        ? prev
        : [post, ...prev]);
    });

    socket.on("posts_updated", fetchPosts);

    return () => {
      socket.close();
    };
  }, []);

  const fetchPosts = async (retries = 3) => {
    try {
      console.log("[Client] Fetching posts from /api/posts...");
      const res = await fetch("/api/posts");
      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch (e) {
          errorData = { error: "Failed to parse error JSON" };
        }
        console.error(`[Client] HTTP error! status: ${res.status}`, errorData);
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorData.error || 'Unknown error'}`);
      }
      const data = await res.json();
      console.log(`[Client] Successfully fetched ${data.length} posts`);
      setPosts(data);
    } catch (err) {
      console.error("[Client] Failed to fetch posts:", err);
      if (retries > 0) {
        console.log(`[Client] Retrying fetch posts... (${retries} attempts left) in 2s`);
        setTimeout(() => fetchPosts(retries - 1), 2000);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setNotification("Image is too large (max 10MB). Compressing...");
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        let result = reader.result as string;
        if (file.size > 500 * 1024) {
          result = await compressImage(result);
        }
        setFormData(prev => ({ ...prev, poster: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMarkAsCompleted = async (postId: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", userEmail }),
      });
      if (res.ok) {
        setNotification("Event marked as completed!");
        setSelectedPost(null);
        fetchPosts();
      } else {
        const data = await res.json();
        setNotification(data.error || "Failed to update status.");
      }
    } catch (err) {
      setNotification("Failed to update status.");
    }
  };

  const handleOpenCreateModal = () => {
    const now = new Date();
    const tomorrowStr = format(addDays(now, 1), "yyyy-MM-dd");
    const dayAfterTomorrowStr = format(addDays(now, 2), "yyyy-MM-dd");
    
    setFormData({
      type: "event",
      title: "",
      organizer: "",
      location: "",
      description: "",
      poster: "",
      eventDate: `${dayAfterTomorrowStr}T09:00`,
      endDate: `${dayAfterTomorrowStr}T16:25`,
      registrationDeadline: `${tomorrowStr}T17:00`,
      registrationLink: "",
      status: "lost",
      contactNumber: ""
    });
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalData = {
      ...formData,
      authorEmail: userEmail.toLowerCase().trim() || "anonymous@campuspulse.local"
    };

    // Date Validation & Defaults
    // CRITICAL: All timestamps sent to the server MUST be in UTC ISO format.
    if (formData.type === "event") {
      const now = new Date();
      const tomorrowStr = format(addDays(now, 1), "yyyy-MM-dd");
      const dayAfterTomorrowStr = format(addDays(now, 2), "yyyy-MM-dd");
      
      // Apply defaults if times are missing
      // Start Time: 9:00 AM
      if (!formData.eventDate) {
        finalData.eventDate = `${dayAfterTomorrowStr}T09:00`;
      } else if (!formData.eventDate.includes('T')) {
        finalData.eventDate = `${formData.eventDate}T09:00`;
      }

      const eventDateOnly = (finalData.eventDate || dayAfterTomorrowStr).split('T')[0];

      // End Time: 4:25 PM (16:25)
      if (!formData.endDate) {
        finalData.endDate = `${eventDateOnly}T16:25`;
      } else if (!formData.endDate.includes('T')) {
        finalData.endDate = `${formData.endDate}T16:25`;
      }
      
      // Last Registration Time: 5:00 PM (17:00)
      if (!formData.registrationDeadline) {
        finalData.registrationDeadline = `${tomorrowStr}T17:00`;
      } else if (!formData.registrationDeadline.includes('T')) {
        finalData.registrationDeadline = `${formData.registrationDeadline}T17:00`;
      }
      
      // Convert to UTC ISO strings before validation and submission
      const toUTC = (dateStr: string) => new Date(dateStr).toISOString();
      
      try {
        finalData.eventDate = toUTC(finalData.eventDate!);
        finalData.endDate = toUTC(finalData.endDate!);
        finalData.registrationDeadline = toUTC(finalData.registrationDeadline!);
      } catch (err) {
        setNotification("Invalid date format. Please check your inputs.");
        return;
      }

      const start = parseISO(finalData.eventDate!);
      const end = parseISO(finalData.endDate!);
      const deadline = parseISO(finalData.registrationDeadline!);
      
      if (isAfter(start, end)) {
        setNotification("End date must be after start date.");
        return;
      }
      if (isAfter(deadline, end)) {
        setNotification("Registration deadline must be before event ends.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        setFormData({
          type: "event",
          title: "",
          organizer: "",
          location: "",
          description: "",
          poster: "",
          eventDate: "",
          endDate: "",
          registrationDeadline: "",
          registrationLink: "",
          status: "lost",
          contactNumber: ""
        });
        fetchPosts();
      } else {
        const data = await res.json();
        setNotification(data.error || "Failed to create post.");
      }
    } catch (err) {
      console.error("Failed to create post", err);
      setNotification("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPosts = useMemo(() => {
    const filtered = posts.filter(p => {
      const matchesTab = p.type === activeTab;

      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (p.organizer && p.organizer.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesDate = !selectedDateFilter || (p.type === "event" ? (() => {
        try {
          if (!p.eventDate) return false;
          const selected = parseISO(selectedDateFilter);
          const start = parseISO(p.eventDate);
          const end = p.endDate ? parseISO(p.endDate) : start;
          
          // Normalize to start of day for accurate date-only comparison
          const sDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
          const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          
          return sDate >= startDate && sDate <= endDate;
        } catch {
          return false;
        }
      })() : (p.createdAt && (() => {
        try {
          return format(parseISO(p.createdAt), 'yyyy-MM-dd') === selectedDateFilter;
        } catch {
          return false;
        }
      })()));

      return matchesTab && matchesSearch && matchesDate;
    });

    return [...filtered].sort((a, b) => {
      // 1. Pinned priority
      if (a.isPinned !== b.isPinned) {
        return (b.isPinned || 0) - (a.isPinned || 0);
      }

      // Default: Newest first
      const timeA = a.createdAt ? parseISO(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? parseISO(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [posts, activeTab, searchQuery, selectedDateFilter]);

  const ongoingEvents = useMemo(() => {
    const now = new Date();
    return filteredPosts.filter(p => {
      if (p.type !== "event" || !p.eventDate || !p.endDate) return false;
      const start = parseISO(p.eventDate);
      const end = parseISO(p.endDate);
      // Ongoing: start <= now <= end
      return !isAfter(start, now) && !isBefore(end, now);
    });
  }, [filteredPosts]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredPosts.filter(p => {
      if (p.type !== "event" || !p.eventDate) return false;
      const start = parseISO(p.eventDate);
      // Upcoming: now < start
      return isAfter(start, now);
    });
  }, [filteredPosts]);

  const previousEvents = useMemo(() => {
    const now = new Date();
    return filteredPosts.filter(p => {
      if (p.type !== "event" || !p.endDate) return false;
      const end = parseISO(p.endDate);
      // Previous: end < now
      // Note: Backend already filters out events older than 4 days.
      return isBefore(end, now);
    });
  }, [filteredPosts]);

  const lostFoundItems = useMemo(() => {
    return filteredPosts.filter(p => p.type === "lost_found");
  }, [filteredPosts]);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    return format(parseISO(dateStr), "EEEE, MMMM d, yyyy 'at' h:mm aa");
  };

  const [reportPostId, setReportPostId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");

  const handleReport = async (postId: number, reason: string) => {
    try {
      const res = await fetch("/api/posts/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reason, reporterEmail: userEmail || "anonymous@example.com" }),
      });
      if (res.ok) {
        setNotification("Post reported successfully. Admins will review it.");
      } else {
        setNotification("Failed to report post.");
      }
    } catch (err) {
      setNotification("Network error. Please try again.");
    }
  };

  return (
    <div className={cn(
      "min-h-screen overflow-x-hidden font-sans transition-colors duration-700 ease-in-out",
      "bg-slate-50 text-slate-900 selection:bg-red-200 selection:text-slate-900",
      "dark:bg-zinc-950 dark:text-zinc-100 dark:selection:bg-cu-red/25 dark:selection:text-red-100"
    )}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl transition-all duration-700 ease-in-out bg-white/75 border-b border-slate-200/80 dark:bg-slate-950/80 dark:border-white/10 shadow-[0_1px_0_rgba(15,23,42,.04)] dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Row 1: App Chrome */}
          <div className="h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all overflow-hidden hidden sm:flex"
              >
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://picsum.photos/seed/college-logo/128/128";
                  }}
                  referrerPolicy="no-referrer"
                />
              </button>
              {/* Mobile Mobile Logo Button */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="sm:hidden w-10 h-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all overflow-hidden"
              >
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://picsum.photos/seed/college-logo/128/128";
                  }}
                  referrerPolicy="no-referrer"
                />
              </button>
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">CAMPUS PULSE</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight mt-0.5">Where events are found before they expire</p>
              </div>
            </div>

            <div className="hidden md:flex items-center flex-1 max-w-md bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-4 py-2 focus-within:bg-white dark:focus-within:bg-white/10 focus-within:border-cu-red transition-all">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-3" />
              <input 
                type="text" 
                placeholder="Search events, locations..." 
                className="bg-transparent border-none focus:outline-none text-sm w-full font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button 
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 bg-cu-red text-white px-5 py-2.5 rounded-md font-bold text-sm hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-cu-red/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Post</span>
              </button>
            </div>
          </div>

          {/* Row 2: Tabs & Filters */}
          <div className="h-16 flex items-center justify-between gap-4 border-t border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab("event")}
                className={cn(
                  "px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 border",
                  activeTab === "event" 
                    ? "bg-cu-red-light border-cu-red/30 text-cu-red" 
                    : "bg-transparent border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <Calendar className="w-4 h-4" />
                Events
              </button>
              <button 
                onClick={handleLostFoundClick}
                className={cn(
                  "px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 border",
                  activeTab === "lost_found" 
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" 
                    : "bg-transparent border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <Package className="w-4 h-4" />
                Lost & Found
                <LostFoundIndicator isSeen={isLostFoundSeen} />
              </button>
            </div>

            <div className="flex items-center gap-4">
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Row 3: Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {activeTab === "event" ? "Upcoming Events" : "Lost & Found"}
            </h2>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              {activeTab === "event" ? `${upcomingEvents.length + ongoingEvents.length} active events` : `${lostFoundItems.length} items found`}
            </p>
          </div>
          
          {/* Quick Filters & Calendar */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {[
                { label: 'Yesterday', value: format(subDays(new Date(), 1), 'yyyy-MM-dd') },
                { label: 'Today', value: format(new Date(), 'yyyy-MM-dd') },
                { label: 'Tomorrow', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') }
              ].map((filter) => (
                <button 
                  key={filter.label}
                  onClick={() => setSelectedDateFilter(selectedDateFilter === filter.value ? null : filter.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all",
                    selectedDateFilter === filter.value 
                      ? "bg-cu-red-light border-cu-red/30 text-cu-red" 
                      : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            
            <div className="relative group">
              <label className={cn(
                "w-10 h-10 flex items-center justify-center rounded-md border transition-all cursor-pointer shadow-sm",
                selectedDateFilter 
                  ? "bg-cu-red-light border-cu-red/30 text-cu-red" 
                  : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
              )}>
                <Calendar className="w-5 h-5" />
                <input 
                  type="date"
                  value={selectedDateFilter || ""}
                  onChange={(e) => setSelectedDateFilter(e.target.value || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              {selectedDateFilter && (
                <button 
                  onClick={() => setSelectedDateFilter(null)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white shadow-lg z-10"
                >
                  <X className="w-2 h-2" />
                </button>
              )}
            </div>
          </div>
        </div>

        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          userEmail={userEmail}
          setIsAdminOpen={setIsAdminOpen}
        />

        {reportPostId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="surface-card p-8 w-full max-w-md space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Report Post</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Help us keep the campus safe</p>
              </div>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-slate-900 dark:text-slate-200 focus:outline-none focus:border-red-500/50 min-h-[120px]"
                placeholder="Reason for reporting..."
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setReportPostId(null)} 
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md font-bold text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleReport(reportPostId, reportReason);
                    setReportPostId(null);
                    setReportReason("");
                  }} 
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-md font-bold text-xs hover:bg-red-500 transition-all shadow-lg shadow-red-500/20"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "event" ? (
          <div className="space-y-12">
            {/* Ongoing Section */}
            {ongoingEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Ongoing Now</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {ongoingEvents.map(post => (
                    <div key={post.id}>
                      <PostCard post={post} onClick={() => setSelectedPost(post)} onReportClick={setReportPostId} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cu-red-light rounded-md flex items-center justify-center border border-cu-red/20">
                  <Calendar className="w-5 h-5 text-cu-red" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Upcoming Events</h2>
              </div>
              {upcomingEvents.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {upcomingEvents.map(post => (
                    <div key={post.id}>
                      <PostCard post={post} onClick={() => setSelectedPost(post)} onReportClick={setReportPostId} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="surface-card p-16 text-center border-2 border-dashed border-slate-300/70 dark:border-white/10">
                  {searchQuery ? (
                    <>
                      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border bg-slate-100 border-slate-200 text-slate-400 dark:bg-white/5 dark:border-white/10 dark:text-slate-600">
                        <Search className="w-7 h-7" />
                      </div>
                      <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm">No events match your search</p>
                      <p className="text-slate-600 dark:text-slate-300/80 text-xs mt-2">Try adjusting your keywords or filters.</p>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-md border bg-cu-red-light border-cu-red/20 text-cu-red">
                        <Calendar className="w-7 h-7" />
                      </div>
                      <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm">No upcoming events found</p>
                      <p className="text-slate-600 dark:text-slate-300/80 text-xs mt-2">Check back later for new events.</p>
                    </>
                  )}
                </div>
              )}
            </section>

            {/* Previous Events Section */}
            {previousEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center border border-slate-500/20">
                    <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Previous Events</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 opacity-75 grayscale-[0.5]">
                  {previousEvents.map(post => (
                    <div key={post.id}>
                      <PostCard post={post} onClick={() => setSelectedPost(post)} onReportClick={setReportPostId} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">Lost & Found</h2>
            </div>
            {lostFoundItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {lostFoundItems.map(post => (
                  <div key={post.id}>
                    <PostCard post={post} onClick={() => setSelectedPost(post)} onReportClick={setReportPostId} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="surface-card p-16 text-center border-2 border-dashed border-slate-300/70 dark:border-white/10">
                {searchQuery ? (
                  <>
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border bg-slate-100 border-slate-200 text-slate-400 dark:bg-white/5 dark:border-white/10 dark:text-slate-600">
                      <Search className="w-7 h-7" />
                    </div>
                    <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm">No items match your search</p>
                    <p className="text-slate-600 dark:text-slate-300/80 text-xs mt-2">Try adjusting your keywords or filters.</p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border bg-amber-500/10 border-amber-500/20 text-amber-700 dark:bg-amber-500/15 dark:border-amber-400/20 dark:text-amber-200">
                      <Package className="w-7 h-7" />
                    </div>
                    <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm">No items reported yet</p>
                    <p className="text-slate-600 dark:text-slate-300/80 text-xs mt-2">Reported items will appear here.</p>
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200/50 dark:border-slate-800/50 mt-12">
        <div className="flex flex-col items-center justify-center gap-0 text-slate-400">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-center leading-relaxed whitespace-nowrap">
            Engineered by Prompts, Elevated by Intellect.
          </p>
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-8 bg-slate-200 dark:bg-slate-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-cu-red/20" />
            <div className="h-[1px] w-8 bg-slate-200 dark:bg-slate-800" />
          </div>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-40">
            Campus Pulse &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* Create Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Post"
        disclaimer="Your IP address will be shared with the DSW Team at Chandigarh University for every post you create. Please post thoughtfully and responsibly."
      >
          <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: "event" }))}
              className={cn(
                "py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2",
                formData.type === "event" ? "bg-white dark:bg-slate-800 text-cu-red shadow-md" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <Calendar className="w-4 h-4" />
              Event
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: "lost_found" }))}
              className={cn(
                "py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2",
                formData.type === "lost_found" ? "bg-white dark:bg-slate-800 text-amber-500 shadow-md" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <Package className="w-4 h-4" />
              Lost & Found
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">
                <ImageIcon className="w-3.5 h-3.5" />
                Title
              </label>
              <input
                required
                type="text"
                placeholder="Enter a catchy title"
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-cu-red/10 focus:border-cu-red outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-slate-200"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {formData.type === "event" && (
              <div>
                <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">
                  <User className="w-3.5 h-3.5" />
                  Organizer
                </label>
                <input
                  required
                  type="text"
                  placeholder="Club name or Department"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-cu-red/10 focus:border-cu-red outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-slate-200"
                  value={formData.organizer}
                  onChange={e => setFormData(prev => ({ ...prev, organizer: e.target.value }))}
                />
              </div>
            )}

            {formData.type === "lost_found" && (
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: "lost" }))}
                  className={cn(
                    "py-3 rounded-xl text-sm font-bold transition-all duration-300",
                    formData.status === "lost" ? "bg-red-500 text-white shadow-lg shadow-red-100 dark:shadow-none" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  Lost
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: "found" }))}
                  className={cn(
                    "py-3 rounded-xl text-sm font-bold transition-all duration-300",
                    formData.status === "found" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100 dark:shadow-none" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  Found
                </button>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">
                <MapPin className="w-3.5 h-3.5" />
                Location
              </label>
              <input
                required
                type="text"
                placeholder="Name or Google Maps link"
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-cu-red/10 focus:border-cu-red outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-slate-200"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">
                <Mail className="w-3.5 h-3.5" />
                Contact Email <span className="normal-case tracking-normal font-medium">(Optional)</span>
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-cu-red/10 focus:border-cu-red outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-slate-200"
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
              />
            </div>

            {formData.type === "lost_found" && (
              <div>
                <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">
                  <Clock className="w-3.5 h-3.5" />
                  Contact Number
                </label>
                <input
                  required
                  type="tel"
                  placeholder="How can people reach you?"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-cu-red/10 focus:border-cu-red outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-slate-200"
                  value={formData.contactNumber}
                  onChange={e => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                />
              </div>
            )}

            {formData.type === "event" && (
              <div>
                <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">
                  <Plus className="w-3.5 h-3.5" />
                  Registration Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://forms.gle/..."
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-cu-red/10 focus:border-cu-red outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-slate-200"
                  value={formData.registrationLink}
                  onChange={e => setFormData(prev => ({ ...prev, registrationLink: e.target.value }))}
                />
              </div>
            )}

            {formData.type === "event" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-cu-red/10 focus:border-cu-red outline-none transition-all dark:text-slate-200"
                    value={formData.eventDate}
                    onChange={e => {
                      const newEventDate = e.target.value;
                      setFormData(prev => {
                        const updates: Partial<Post> = { eventDate: newEventDate };
                        if (newEventDate && newEventDate.includes('T')) {
                          const dateOnly = newEventDate.split('T')[0];
                          if (!prev.endDate) {
                            updates.endDate = `${dateOnly}T16:25`;
                          }
                          if (!prev.registrationDeadline) {
                            updates.registrationDeadline = `${dateOnly}T17:00`;
                          }
                        }
                        return { ...prev, ...updates };
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-cu-red/10 focus:border-cu-red outline-none transition-all dark:text-slate-200"
                    value={formData.endDate}
                    onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">Last Registration Time</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-cu-red/10 focus:border-cu-red outline-none transition-all dark:text-slate-200"
                    value={formData.registrationDeadline}
                    onChange={e => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">Description</label>
              <textarea
                required
                rows={4}
                placeholder="Give us all the details..."
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-cu-red/10 focus:border-cu-red outline-none transition-all resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-slate-200"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1">Poster / Image</label>
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-md p-10 text-center group-hover:border-cu-red/50 group-hover:bg-cu-red-light transition-all duration-500">
                  {formData.poster ? (
                    <div className="relative inline-block">
                      <img src={formData.poster} alt="Preview" className="max-h-56 mx-auto rounded-2xl shadow-2xl" />
                      <div className="absolute inset-0 bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-xs font-bold uppercase tracking-widest">Change Image</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-cu-red-light transition-all duration-500">
                        <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 group-hover:text-cu-red" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-bold tracking-tight">Click or drag to upload poster</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full py-5 rounded-[1.5rem] font-black text-lg transition-all shadow-2xl flex items-center justify-center gap-3",
              isSubmitting 
                ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed text-white" 
                : "bg-cu-red text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-cu-red/20 dark:shadow-none"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Plus className="w-6 h-6" />
                Publish Post
              </>
            )}
          </button>
        </form>
    </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedPost}
        onClose={() => { setSelectedPost(null); setIsPosterModalOpen(false); }}
        title={selectedPost?.title || ""}
      >
        {selectedPost && (
          <div className="space-y-8">
            {selectedPost.poster && (
              <div className="flex flex-col gap-4">
                <div 
                  onClick={() => setIsPosterModalOpen(true)}
                  className="rounded-[2rem] overflow-hidden shadow-2xl relative group/poster w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 cursor-pointer"
                >
                  <img 
                    src={selectedPost.poster} 
                    alt={selectedPost.title} 
                    className="w-full h-[180px] object-cover object-top hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl shrink-0">
                    {selectedPost.type === "event" ? <Calendar className="w-6 h-6 text-zinc-600 dark:text-zinc-400" /> : <Package className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Post Type</p>
                    <p className="text-zinc-900 dark:text-zinc-100 font-bold">{selectedPost.type === "event" ? "Campus Event" : "Lost & Found"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl shrink-0">
                    <MapPin className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Location</p>
                    <p className="text-zinc-900 dark:text-zinc-100 font-bold text-sm truncate">
                      {selectedPost.location.startsWith('http') ? "Google Maps Location" : toTitleCase(selectedPost.location)}
                    </p>
                    <a 
                      href={selectedPost.location.startsWith('http') ? selectedPost.location : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPost.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/10 text-cu-red dark:text-red-400 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] hover:bg-cu-red hover:text-white transition-all border border-cu-red-light dark:border-red-500/20 shadow-sm"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      View on Google Maps
                    </a>
                  </div>
                </div>

                {selectedPost.type === "event" && (
                  <div className="sm:col-span-2 mt-2">
                    <div className="rounded-[2rem] overflow-hidden border border-zinc-200 dark:border-zinc-800 h-56 bg-zinc-100 dark:bg-zinc-800 relative shadow-inner">
                      <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedPost.location)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                )}

                {selectedPost.type === "lost_found" && (
                  <div className="flex items-start gap-4">
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl">
                      <Clock className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Contact</p>
                      <p className="text-zinc-900 dark:text-zinc-100 font-bold">{selectedPost.contactNumber}</p>
                    </div>
                  </div>
                )}

                {selectedPost.type === "event" && (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl">
                        <User className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Organizer</p>
                        <p className="text-zinc-900 dark:text-zinc-100 font-bold">{selectedPost.organizer}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl">
                        <Clock className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Registration Deadline</p>
                        <p className="text-zinc-900 dark:text-zinc-100 font-bold text-sm truncate">{format(new Date(selectedPost.registrationDeadline), "EEE, MMM d 'at' h:mm a")}</p>
                        <RegistrationCountdown deadline={selectedPost.registrationDeadline!} />
                      </div>
                    </div>
                  </>
                )}

                {selectedPost.type === "lost_found" && selectedPost.status && (
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-2xl border shrink-0",
                      selectedPost.status === "lost" 
                        ? "bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800" 
                        : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800"
                    )}>
                      <AlertCircle className={cn(
                        "w-6 h-6",
                        selectedPost.status === "lost" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                      )} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Status</p>
                      <p className={cn(
                        "font-black uppercase tracking-widest text-sm",
                        selectedPost.status === "lost" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                      )}>{selectedPost.status}</p>
                    </div>
                  </div>
                )}

                {selectedPost.type === "event" && selectedPost.status === "completed" && (
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl border shrink-0 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Status</p>
                      <p className="font-black uppercase tracking-widest text-sm text-emerald-600 dark:text-emerald-400">Completed</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {selectedPost.type === "event" && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-cu-red-light dark:bg-red-900/30 p-3 rounded-md border border-cu-red/20 shrink-0">
                        <Calendar className="w-6 h-6 text-cu-red" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-cu-red/60 uppercase tracking-wider mb-0.5">Starts At</p>
                        <p className="text-slate-900 dark:text-slate-100 font-bold text-sm truncate">
                          {format(new Date(selectedPost.eventDate), "EEE, MMM d 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
                        <Clock className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Ends At</p>
                        <p className="text-slate-900 dark:text-slate-100 font-bold text-sm truncate">{format(new Date(selectedPost.endDate), "EEE, MMM d 'at' h:mm a")}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Description</p>
                  <div className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedPost.description}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Posted By</p>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Mail className="w-3 h-3" />
                  <p className="text-xs font-bold">{formatEmail(selectedPost.authorEmail)}</p>
                </div>
                <p className="text-[9px] text-slate-400 font-medium">
                  {format(parseISO(selectedPost.createdAt), "MMMM d, yyyy 'at' h:mm aa")}
                </p>
              </div>
              {selectedPost.type === "event" && (
                <div className="flex flex-col sm:flex-row gap-3">
                  {selectedPost.status !== "completed" && (userEmail === "admin@cuchd.in" || userEmail === "csquare@cuchd.in" || userEmail === selectedPost.authorEmail) && (
                    <button
                      onClick={() => handleMarkAsCompleted(selectedPost.id)}
                      className="flex-1 px-8 py-3 rounded-xl font-bold bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-all text-center"
                    >
                      Mark as Completed
                    </button>
                  )}
                  <a 
                    href={selectedPost.registrationLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={cn(
                      "bg-cu-red text-white px-8 py-3 rounded-md font-bold hover:opacity-90 transition-all shadow-lg shadow-cu-red/20 text-center flex-1",
                      (!selectedPost.registrationLink || 
                       selectedPost.status === "completed" || 
                       (selectedPost.registrationDeadline && isAfter(new Date(), parseISO(selectedPost.registrationDeadline)))) && 
                      "opacity-50 pointer-events-none grayscale"
                    )}
                  >
                    {!selectedPost.registrationLink 
                      ? "No Link Provided" 
                      : selectedPost.status === "completed"
                        ? "Event Completed"
                        : (selectedPost.registrationDeadline && isAfter(new Date(), parseISO(selectedPost.registrationDeadline)))
                          ? "Registration Closed"
                          : "Register Now"
                    }
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Dashboard */}
      {isAdminOpen && (
        (() => {
          try {
            return sessionStorage.getItem("campus_pulse_user_type") === "club" ? 
              <ClubDashboard onClose={() => setIsAdminOpen(false)} /> :
              <AdminDashboard onClose={() => setIsAdminOpen(false)} />;
          } catch (e) {
            return <AdminDashboard onClose={() => setIsAdminOpen(false)} />;
          }
        })()
      )}

      {/* Toasts */}
      <AnimatePresence>
        {notification && (
          <AppNotification 
            message={notification} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>


      {/* Poster Full View Modal */}
      <AnimatePresence>
        {isPosterModalOpen && selectedPost?.poster && (
          <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl"
            onClick={() => setIsPosterModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                transition: { type: "spring", damping: 30, stiffness: 200, mass: 0.8 }
              }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white/5 p-1">
                <img 
                  src={selectedPost.poster} 
                  alt={selectedPost.title} 
                  className="max-w-full max-h-[70vh] object-contain rounded-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex flex-col items-center gap-4 w-full overflow-hidden">
                <button 
                  onClick={() => downloadImage(selectedPost.poster!, selectedPost.title)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white text-white hover:text-black rounded-xl font-bold uppercase tracking-wider backdrop-blur-md transition-all shadow-2xl active:scale-95 group/btn text-[10px] border border-white/20"
                >
                  <Download className="w-3.5 h-3.5 transition-transform group-hover/btn:-translate-y-0.5" />
                  Download Poster
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
