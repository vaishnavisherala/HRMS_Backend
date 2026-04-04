const nodemailer = require("nodemailer");

//connect with gmail smtp
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // IMPORTANT: false for TLS
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // 🔥 FIX SSL ERROR
  },
});

module.exports = transporter;