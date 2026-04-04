const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const transporter = require("../config/mailer");

// 🔹 REGISTER ADMIN (only once)
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

    res.json({ token, admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Check if employee already exists
    const existing = await prisma.employee.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({
        message: "Employee with this email already exists",
      });
    }

    // Create employee
    const emp = await prisma.employee.create({
      data: {
        name,
        email,
      },
    });

    const token = uuidv4();

    await prisma.activationToken.create({
      data: {
        token,
        emp_id: emp.emp_id,
        expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const link = `${process.env.CLIENT_URL}/activate/${token}`;

    await transporter.sendMail({
      to: emp.email,
      subject: "Activate Account",
      html: `<a href="${link}">Activate your account</a>`,
    });

    res.json({ message: "Employee created & email sent" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.activateEmployee = async (req, res) => {
  try {
    const record = await prisma.activationToken.findUnique({
      where: { token: req.body.token },
    });

    if (!record || record.isUsed)
      return res.status(400).json({ message: "Invalid token" });

    const hash = await bcrypt.hash(req.body.password, 10);

    await prisma.employee.update({
      where: { emp_id: record.emp_id },
      data: {
        password: hash,
        is_verified: true,
        status: "Active",
      },
    });

    await prisma.activationToken.update({
      where: { token: req.body.token },
      data: { isUsed: true },
    });

    res.json({ message: "Account activated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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

    res.json({ token, emp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};