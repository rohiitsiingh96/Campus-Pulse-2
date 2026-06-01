export type PostType = "event" | "lost_found";
export type SortMethod = "nearest" | "farthest" | "reg_closes_soon";
export type EventCategory = "technical" | "cultural" | "sports" | "other";
export type EventMode = "online" | "offline" | "both";

export interface Post {
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
  category?: EventCategory;
  mode?: EventMode;
}

export interface FilterState {
  sortBy: SortMethod;
  date: Date | null;
  category: EventCategory | "all";
  mode: EventMode | "all";
  search: string;
}
