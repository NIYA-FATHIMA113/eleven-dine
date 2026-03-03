import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("food_expense.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    is_present INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS daily_packets (
    date TEXT PRIMARY KEY,
    breakfast_packets INTEGER DEFAULT 0,
    dinner_packets INTEGER DEFAULT 0
  );
`);

const initialUsers = [
  "Niya", "Eldho", "Aji", "Janna", "Anashu", 
  "Nandu", "Gatha", "Gayathri", "Vaishnavi", 
  "Aleetta", "Shreya"
];

const insertUser = db.prepare("INSERT OR IGNORE INTO users (name) VALUES (?)");
initialUsers.forEach(name => insertUser.run(name));

// Cleanup: Remove users not in the initial list
const placeholders = initialUsers.map(() => "?").join(",");
db.prepare(`DELETE FROM users WHERE name NOT IN (${placeholders})`).run(...initialUsers);
db.prepare(`DELETE FROM entries WHERE user_id NOT IN (SELECT id FROM users)`).run();

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.get("/api/data", (req, res) => {
    const { month } = req.query; // Format: YYYY-MM
    const entries = db.prepare(`
      SELECT e.*, u.name as user_name 
      FROM entries e 
      JOIN users u ON e.user_id = u.id 
      WHERE e.date LIKE ?
    `).all(`${month}%`);

    const packets = db.prepare(`
      SELECT * FROM daily_packets 
      WHERE date LIKE ?
    `).all(`${month}%`);

    res.json({ entries, packets });
  });

  app.post("/api/presence", (req, res) => {
    const { user_id, date, is_present } = req.body;
    const existing = db.prepare("SELECT id FROM entries WHERE user_id = ? AND date = ?").get(user_id, date) as { id: number } | undefined;
    
    if (existing) {
      db.prepare("UPDATE entries SET is_present = ? WHERE id = ?").run(is_present ? 1 : 0, existing.id);
    } else {
      db.prepare("INSERT INTO entries (user_id, date, is_present) VALUES (?, ?, ?)").run(user_id, date, is_present ? 1 : 0);
    }
    res.json({ success: true });
  });

  app.post("/api/packets", (req, res) => {
    const { date, breakfast_packets, dinner_packets } = req.body;
    db.prepare(`
      INSERT INTO daily_packets (date, breakfast_packets, dinner_packets) 
      VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET 
        breakfast_packets = excluded.breakfast_packets,
        dinner_packets = excluded.dinner_packets
    `).run(date, breakfast_packets, dinner_packets);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
