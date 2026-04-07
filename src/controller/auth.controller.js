const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const transporter = require("../config/mailer");

// ✅ REGISTER ADMIN
exports.registerAdmin = async (req, res) => {
  try {
    const exists = await prisma.admin.findFirst();

    if (exists) {
      return res.status(403).json({ message: "Admin already exists" });
    }

    const hash = await bcrypt.hash(req.body.password, 10);

    await prisma.admin.create({
      data: {
        name: req.body.name,
        email: req.body.email,
        password: hash,
      },
    });

    res.json({ message: "Admin created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ✅ ADMIN LOGIN (FIXED)
exports.adminLogin = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { email: req.body.email },
    });

    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    const match = await bcrypt.compare(req.body.password, admin.password);

    if (!match)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: admin.admin_id, role: "Admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ IMPORTANT FIX
    res.json({
      token,
      user: {
        ...admin,
        role: "Admin"
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ✅ CREATE EMPLOYEE + SEND EMAIL
exports.createEmployee = async (req, res) => {
  try {
    const { name, email } = req.body;

    const existing = await prisma.employee.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({
        message: "Employee already exists",
      });
    }

    const emp = await prisma.employee.create({
      data: { name, email },
    });

    const token = uuidv4();

    await prisma.activationToken.create({
      data: {
        token,
        emp_id: emp.emp_id,
        expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const link = `https://b0de-103-71-64-6.ngrok-free.app/activate/${token}`;

    console.log("Activation Link:", link);

    // ⚠️ If mail error → comment this block
    await transporter.sendMail({
      to: email,
      subject: "Activate your account",
      html: `
        <h3>Welcome to HRMS</h3>
        <p>Click below to activate your account:</p>
        <a href="${link}">${link}</a>
      `,
    });

    res.json({ message: "Employee created & activation email sent" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ✅ ACTIVATE EMPLOYEE
exports.activateEmployee = async (req, res) => {
  try {
    const { token, password } = req.body;

    const record = await prisma.activationToken.findUnique({
      where: { token },
    });

    if (!record)
      return res.status(400).json({ message: "Invalid token" });

    if (record.isUsed)
      return res.status(400).json({ message: "Token already used" });

    if (new Date() > record.expiry)
      return res.status(400).json({ message: "Token expired" });

    const hash = await bcrypt.hash(password, 10);

    await prisma.employee.update({
      where: { emp_id: record.emp_id },
      data: {
        password: hash,
        is_verified: true,
        status: "Active",
      },
    });

    await prisma.activationToken.update({
      where: { token },
      data: { isUsed: true },
    });

    res.json({ message: "Account activated successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ✅ EMPLOYEE LOGIN (FIXED)
exports.employeeLogin = async (req, res) => {
  try {
    const emp = await prisma.employee.findUnique({
      where: { email: req.body.email },
    });

    if (!emp)
      return res.status(404).json({ message: "Employee not found" });

    if (!emp.is_verified)
      return res.status(400).json({ message: "Account not activated" });

    const match = await bcrypt.compare(req.body.password, emp.password);

    if (!match)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: emp.emp_id, role: "Employee" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ IMPORTANT FIX
    res.json({
      token,
      user: {
        ...emp,
        role: "Employee"
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ✅ GET EMPLOYEES (FIXED FORMAT)
exports.getEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        emp_id: true,
        name: true,
        email: true,
        status: true,
        is_verified: true,
        createdAt: true,
      },
    });

    // ✅ IMPORTANT FIX
    res.json({ employees });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};