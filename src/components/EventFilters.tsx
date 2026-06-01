import React from "react";
import { Filter, ArrowUpDown, Calendar as CalendarIcon, X } from "lucide-react";
import { FilterState, SortMethod, EventCategory, EventMode } from "../types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface EventFiltersProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
}

export const EventFilters: React.FC<EventFiltersProps> = ({ filters, setFilters }) => {
  const categories: (EventCategory | "all")[] = ["all", "technical", "cultural", "sports", "other"];
  const modes: (EventMode | "all")[] = ["all", "online", "offline"];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 mb-12 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-6 items-end">
        {/* Search & Sort */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Sort By
            </label>
            <div className="relative">
              <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as SortMethod })}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer"
                aria-label="Sort events by"
              >
                <option value="nearest">Nearest First</option>
                <option value="farthest">Farthest First</option>
                <option value="reg_closes_soon">Reg. Closes Soon</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Filter by Date
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <DatePicker
                selected={filters.date}
                onChange={(date) => setFilters({ ...filters, date })}
                placeholderText="Select a date"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                aria-label="Filter events by date"
              />
              {filters.date && (
                <button 
                  onClick={() => setFilters({ ...filters, date: null })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category & Mode */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Event Type
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilters({ ...filters, category: cat })}
                  className={`px-4 py-2 rounded-md text-xs font-bold capitalize transition-all
                    ${filters.category === cat 
                      ? 'bg-cu-red text-white shadow-lg shadow-cu-red/20' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Mode
            </label>
            <div className="flex gap-2">
              {modes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilters({ ...filters, mode: mode })}
                  className={`flex-1 py-2 rounded-md text-xs font-bold capitalize transition-all
                    ${filters.mode === mode 
                      ? 'bg-cu-red text-white shadow-lg shadow-cu-red/20' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}
                  `}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
