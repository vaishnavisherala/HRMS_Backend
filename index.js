require("dotenv").config(); // ← MUST be absolute first line

const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth",       require("./src/routes/auth.routes"));
app.use("/api/users",      require("./src/routes/user.routes"));
app.use("/api/admin",      require("./src/routes/admin.routes"));
// Phase 1 — new
app.use("/api/lookups",    require("./src/routes/lookup.routes"));
app.use("/api/attendance", require("./src/routes/attendance.routes"));

//employee profile routes
app.use("/api/employees",  require("./src/routes/profile.routes"));

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// 404
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));