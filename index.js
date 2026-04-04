require("dotenv").config();  // 🔥 must be first line
const express = require("express");
const app = express();

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