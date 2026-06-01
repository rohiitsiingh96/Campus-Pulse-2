import React from "react";
import { Mail, Linkedin, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded shrink-0 overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="Campus Pulse Logo" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://picsum.photos/seed/college-logo/128/128";
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
                CAMPUS<span className="text-cu-red">PULSE</span>
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              The ultimate destination for campus life. Discover events, find lost items, 
              and stay connected with your college community.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6">
              Quick Links
            </h4>
            <ul className="space-y-4">
              {["Home", "Events", "Lost & Found", "About Us"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-cu-red transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6">
              Connect
            </h4>
            <div className="flex gap-4">
              <a href="#" className="p-3 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-cu-red transition-all">
                <Mail className="w-5 h-5" />
              </a>
              <a href="#" className="p-3 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-cu-red transition-all">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-medium text-slate-400">
            © 2024 Campus Pulse. All rights reserved.
          </p>
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for the student community.
          </p>
        </div>
      </div>
    </footer>
  );
};
