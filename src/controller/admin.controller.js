const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const transporter = require("../config/mailer");

// ✅ CREATE EMPLOYEE + SEND EMAIL
exports.createEmployee = async (req, res) => {
  try {
    const { l_name, f_name, m_name, email, Gender } = req.body;

    const existing = await prisma.employee.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({
        message: "Employee already exists",
      });
    }
    const emp = await prisma.employee.create({
      data: { f_name, m_name,l_name, email, Gender},
    });
    const token = uuidv4();
    await prisma.activationToken.create({
      data: {
        token,
        emp_id: emp.emp_id,
        expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const link = `${process.env.BASE_URL}/activate/${token}`;

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
        is_active: true,
        
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

//  GET EMPLOYEES (FIXED FORMAT)
exports.getEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        emp_id: true,
        f_name: true,
        m_name: true,
        l_name: true,
        email: true,
        is_active: true,
        Gender: true,
        createdAt: true,
        details:true,
      },
    });
    res.json({ employees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



//get all attendance records (Admin only)

exports.getAllAttendance = async (req, res) => {
  try {
    const records = await prisma.attendance.findMany({
      include: {
        employee: {
          select: {
            emp_id: true,
            f_name: true,
            l_name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    res.json({ records });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};