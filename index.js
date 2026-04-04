require("dotenv").config();  // 🔥 must be first line
const express = require("express");
const app = express();

app.use(express.json());

app.get("/",(req,res)=>{
  res.send("welcome to HRMS");
})

app.use("/api/auth", require("./src/routes/auth.routes"));


app.listen(3000, () => {
  console.log("Server running on port 3000");
});

module.exports = app;