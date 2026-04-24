<<<<<<< HEAD
require("dotenv").config();  // 🔥 must be first line
const express = require("express");

const cors=require('cors');
const app = express();

app.use(cors()); // ✅ VERY IMPORTANT


app.use(express.json());

app.get("/",(req,res)=>{
  res.send("welcome to HRMS");
})

app.get("/activate/:token", (req, res) => {
  const token = req.params.token;

  res.send(`
    <h1> Two Elephant Technologies LLP </h1>
   <h1> Employee Activation</h1>
    <h2>Set Password</h2>

    <input id="password" placeholder="Password"/><br/><br/>
    <input id="confirm" placeholder="Confirm Password"/><br/><br/>

    <button onclick="submitForm()">Submit</button>

    <script>
      async function submitForm() {
        const password = document.getElementById("password").value;
        const confirm = document.getElementById("confirm").value;

        if(password !== confirm){
          alert("Passwords do not match");
          return;
        }

        const res = await fetch("/api/auth/activate-employee", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            token: "${token}",
            password
          })
        });

        const data = await res.json();
        alert(data.message);
      }
    </script>
  `);
});

app.use("/api/auth", require("./src/routes/auth.routes"));


app.listen(3000, () => {
  console.log("Server running on port 3000");
});

module.exports = app;
=======
require("dotenv").config(); // ← MUST be absolute first line

const express = require("express");
const cors = require("cors"); 
const app = express();

app.use(cors({
  origin: "http://localhost:8081", // your Vue frontend
  credentials: true
}));

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
>>>>>>> b4fb8b0bec2fd78eef6cc334bde511aa71d462c2
