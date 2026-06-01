import React, { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LostFoundIndicatorProps {
  isSeen: boolean;
  onClick?: () => void;
}

export function LostFoundIndicator({ isSeen, onClick }: LostFoundIndicatorProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative w-3.5 h-3.5 rounded-full transition-all duration-500 cursor-pointer flex items-center justify-center",
        isSeen 
          ? "bg-slate-300 dark:bg-slate-600 shadow-none" 
          : "animate-ambulance"
      )}
      title={isSeen ? "No new items" : "New items in Lost & Found!"}
    >
      {!isSeen && (
        <>
          {/* Outer Pulse */}
          <span className="absolute inset-0 rounded-full animate-ping opacity-40 bg-red-500 scale-150"></span>
          {/* Inner Light Core */}
          <div className="w-1.5 h-1.5 bg-white/80 rounded-full blur-[1px] shadow-[0_0_4px_white]"></div>
        </>
      )}
    </div>
  );
}
