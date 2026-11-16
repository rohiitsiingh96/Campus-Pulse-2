import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cron from "node-cron";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let db: any;

const initializeDb = (database: any) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      organizer TEXT,
      location TEXT NOT NULL,
      description TEXT,
      poster TEXT,
      eventDate TEXT,
      endDate TEXT,
      registrationDeadline TEXT,
      registrationLink TEXT,
      status TEXT,
      contactNumber TEXT,
      authorEmail TEXT,
      completedAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId INTEGER NOT NULL,
      reason TEXT NOT NULL,
      reporterEmail TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(postId) REFERENCES posts(id)
    );

  `);

  // Migration for existing databases
  try { database.exec("ALTER TABLE posts ADD COLUMN registrationLink TEXT"); } catch (e) {}
  try { database.exec("ALTER TABLE posts ADD COLUMN status TEXT"); } catch (e) {}
  try { database.exec("ALTER TABLE posts ADD COLUMN contactNumber TEXT"); } catch (e) {}
  try { database.exec("ALTER TABLE posts ADD COLUMN authorEmail TEXT"); } catch (e) {}
  try { database.exec("ALTER TABLE posts ADD COLUMN completedAt TEXT"); } catch (e) {}
  try { database.exec("ALTER TABLE posts ADD COLUMN isPinned INTEGER DEFAULT 0"); } catch (e) {}
};

try {
  db = new Database("campus_pulse.db");
  initializeDb(db);
} catch (err) {
  console.error("Database initialization failed, falling back to in-memory:", err);
  db = new Database(":memory:");
  initializeDb(db);
}

async function startServer() {
  console.log('Starting server...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });
  app.use(express.json({ limit: "10mb" }));

  // Global logging middleware
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    console.log("[Server] Health check requested");
    let tables: string[] = [];
    try {
      if (db) {
        const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        tables = rows.map((r: any) => r.name);
      }
    } catch (e) {
      console.error("[Server] Health check DB error:", e);
    }
    
    res.json({ 
      status: "ok", 
      db: db ? "connected" : "failed",
      tables,
      env: process.env.NODE_ENV || "development"
    });
  });

  // API Routes
  app.get("/api/posts", (req, res) => {
    console.log("[Server] GET /api/posts requested");
    try {
      if (!db) {
        console.error("Database object is undefined in /api/posts");
        return res.status(500).json({ error: "Database not initialized" });
      }
      
      // Events remain visible through the third calendar day after their end date.
      // They are removed at the start of the fourth calendar day.
      const cutoff = new Date();
      cutoff.setUTCDate(cutoff.getUTCDate() - 4);
      cutoff.setUTCHours(0, 0, 0, 0);
      const visibilityBuffer = cutoff.toISOString();

      const query = `
        SELECT * FROM posts 
        WHERE 
          (type = 'event' AND endDate IS NOT NULL AND date(endDate) > date(?))
          OR type != 'event'
        ORDER BY isPinned DESC, createdAt DESC
      `;
      
      const posts = db.prepare(query).all(visibilityBuffer);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/posts", (req, res) => {
    try {
      let { 
        type, title, organizer, location, description, 
        poster, eventDate, endDate, registrationDeadline,
        registrationLink, status, contactNumber, authorEmail
      } = req.body;

      // Basic spam filtering: check if the same user has posted in the last minute
      const recentPost = db.prepare("SELECT * FROM posts WHERE authorEmail = ? AND createdAt > datetime('now', '-1 minute')").get(authorEmail);
      if (recentPost) {
        return res.status(429).json({ error: "You are posting too frequently. Please wait a minute." });
      }

      // Server-side validation and defaults for events
      // CRITICAL: All timestamps stored in the database MUST be in UTC ISO format.
      if (type === "event") {
        const nowUTC = new Date();
        const todayStrUTC = nowUTC.toISOString().split('T')[0];
        
        // Apply defaults if missing (using UTC times)
        // Default Start: 09:30 UTC
        // Default End: 16:25 UTC
        // Default Reg: 17:00 UTC
        if (!eventDate) eventDate = `${todayStrUTC}T09:30:00.000Z`;
        if (!endDate) endDate = `${eventDate.split('T')[0]}T16:25:00.000Z`;
        if (!registrationDeadline) registrationDeadline = `${eventDate.split('T')[0]}T17:00:00.000Z`;

        // Ensure they are valid ISO strings and in UTC
        const ensureUTC = (dateStr: string) => {
          const d = new Date(dateStr);
          return d.toISOString();
        };

        try {
          eventDate = ensureUTC(eventDate);
          endDate = ensureUTC(endDate);
          registrationDeadline = ensureUTC(registrationDeadline);
        } catch (e) {
          return res.status(400).json({ error: "Invalid date format provided." });
        }

        // Validation logic (UTC comparisons)
        if (new Date(eventDate) >= new Date(endDate)) {
          return res.status(400).json({ error: "Event end time must be strictly after start time." });
        }
        if (new Date(registrationDeadline) > new Date(endDate)) {
          return res.status(400).json({ error: "Registration deadline cannot exceed the event end time." });
        }
      }

      const stmt = db.prepare(`
        INSERT INTO posts (
          type, title, organizer, location, description, 
          poster, eventDate, endDate, registrationDeadline,
          registrationLink, status, contactNumber, authorEmail
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        type, title, organizer, location, description, 
        poster, eventDate, endDate, registrationDeadline,
        registrationLink, status, contactNumber, authorEmail
      );

      const newPost = { 
        id: info.lastInsertRowid, 
        type, title, organizer, location, description, 
        poster, eventDate, endDate, registrationDeadline,
        registrationLink, status, contactNumber, authorEmail,
        createdAt: new Date().toISOString() // Stored as UTC ISO
      };
      
      io.emit("new_post", newPost);
      res.json(newPost);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/posts/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM reports WHERE postId = ?").run(req.params.id);
      db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
      io.emit("posts_updated");
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Update post status (e.g., mark as completed)
  app.patch("/api/posts/:id/status", (req, res) => {
    try {
      const { status, userEmail } = req.body;
      const postId = req.params.id;

      // Check if post exists and if user is authorized
      const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as any;
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Authorization: Admin, Club, or Author
      const isAdmin = userEmail === "admin@cuchd.in";
      const isClub = userEmail === "csquare@cuchd.in";
      const isAuthor = post.authorEmail === userEmail;

      if (!isAdmin && !isClub && !isAuthor) {
        return res.status(403).json({ error: "Unauthorized to update this post" });
      }

      const completedAt = status === "completed" ? new Date().toISOString() : null;

      db.prepare("UPDATE posts SET status = ?, completedAt = ? WHERE id = ?")
        .run(status, completedAt, postId);

      const updatedPost = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId);
      io.emit("posts_updated");
      res.json(updatedPost);
    } catch (error) {
      console.error("Error updating post status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Report a post
  app.post("/api/posts/report", (req, res) => {
    const { postId, reason, reporterEmail } = req.body;
    db.prepare("INSERT INTO reports (postId, reason, reporterEmail) VALUES (?, ?, ?)").run(postId, reason, reporterEmail);
    res.json({ success: true });
  });

  // Admin: Get reports
  app.get("/api/admin/reports", (req, res) => {
    // Simple check - in production, use proper auth
    if (req.headers.authorization !== "admin-secret") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const reports = db.prepare("SELECT r.*, p.title as postTitle FROM reports r JOIN posts p ON r.postId = p.id").all();
    res.json(reports);
  });

  // Admin: Get all posts with report details
  app.get("/api/admin/posts", (req, res) => {
    if (req.headers.authorization !== "admin-secret") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Events remain visible for 4 days after their end date.
    // We use UTC normalization to avoid timezone-related visibility bugs.
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 4);
    cutoff.setUTCHours(0, 0, 0, 0);
    const visibilityBuffer = cutoff.toISOString();

    const query = `
      SELECT * FROM posts 
      WHERE 
        (type = 'event' AND endDate IS NOT NULL AND endDate >= ?)
        OR type != 'event'
      ORDER BY isPinned DESC, createdAt DESC
    `;
    
    const posts = db.prepare(query).all(visibilityBuffer);
    
    // Get all reports
    const reports = db.prepare("SELECT * FROM reports").all();
    
    // Combine them
    const postsWithReports = posts.map((post: any) => {
      const postReports = reports.filter((r: any) => r.postId === post.id);
      return {
        ...post,
        reports: postReports,
        reportCount: postReports.length
      };
    });
    
    // Sort: Pinned first, then Reported posts, then by date
    postsWithReports.sort((a: any, b: any) => {
      if (a.isPinned !== b.isPinned) return b.isPinned - a.isPinned;
      if (a.reportCount > 0 && b.reportCount === 0) return -1;
      if (a.reportCount === 0 && b.reportCount > 0) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    res.json(postsWithReports);
  });

  // Admin: Toggle pin status
  app.patch("/api/admin/posts/:id/pin", (req, res) => {
    if (req.headers.authorization !== "admin-secret") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    const { isPinned } = req.body;
    
    try {
      db.prepare("UPDATE posts SET isPinned = ? WHERE id = ?").run(isPinned ? 1 : 0, id);
      io.emit("posts_updated");
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating pin status:", error);
      res.status(500).json({ error: "Failed to update pin status" });
    }
  });

  // Admin: Delete a post
  app.delete("/api/admin/posts/:id", (req, res) => {
    // Simple check - in production, use proper auth
    if (req.headers.authorization !== "admin-secret") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    db.prepare("DELETE FROM reports WHERE postId = ?").run(req.params.id);
    db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
    io.emit("posts_updated");
    res.json({ success: true });
  });

  // Production-grade Auto-deletion logic using node-cron
  // Runs once every hour at the top of the hour
  cron.schedule("0 * * * *", () => {
    const now = new Date();
    const timestamp = now.toISOString();
    
    try {
      // Events ending four or more calendar days ago are permanently removed.
      // Deleting the post row also removes any base64 poster stored with it.
      const fourCalendarDaysAgo = new Date(now);
      fourCalendarDaysAgo.setUTCDate(fourCalendarDaysAgo.getUTCDate() - 4);
      fourCalendarDaysAgo.setUTCHours(0, 0, 0, 0);
      const expiredEvents = db.prepare(`
        SELECT id FROM posts
        WHERE type = 'event'
          AND endDate IS NOT NULL
          AND date(endDate) <= date(?)
      `).all(fourCalendarDaysAgo.toISOString()) as Array<{ id: number }>;

      for (const event of expiredEvents) {
        db.prepare("DELETE FROM reports WHERE postId = ?").run(event.id);
        db.prepare("DELETE FROM posts WHERE id = ?").run(event.id);
      }

      // Lost and found posts older than 72 hours (3 days) are removed.
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const lostFoundResult = db.prepare("DELETE FROM posts WHERE type = 'lost_found' AND createdAt < ?").run(threeDaysAgo);

      const totalChanges = expiredEvents.length + lostFoundResult.changes;
      
      if (totalChanges > 0) {
        db.exec("VACUUM");
        console.log(`[Cleanup Job] Executed at ${timestamp}, deleted ${expiredEvents.length} expired events and ${lostFoundResult.changes} old lost/found posts.`);
        io.emit("posts_updated");
      } else {
        console.log(`[Cleanup Job] Executed at ${timestamp}, no expired content found.`);
      }
    } catch (error) {
      console.error(`[Cleanup Job] Error encountered at ${timestamp}:`, error);
    }
  });

  // Vite middleware for development
  const isProduction = process.env.NODE_ENV === "production";
  const distExists = fs.existsSync(path.join(__dirname, "dist"));

  if (!isProduction || !distExists) {
    console.log('Initializing Vite...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicitly serve index.html for SPA fallback in dev mode
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      console.log(`[Server] Handling request for: ${url}`);
      try {
        const indexPath = path.resolve(__dirname, "index.html");
        console.log(`[Server] Reading index.html from: ${indexPath}`);
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        console.error(`[Server] Error serving index.html:`, e);
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log('Serving static files from dist...');
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
