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



// EMPLOYEE LOGIN (FIXED)
exports.employeeLogin = async (req, res) => {
  try {
    const emp = await prisma.employee.findUnique({
      where: { email: req.body.email },
    });

    if (!emp)
      return res.status(404).json({ message: "Employee not found" });

    if (!emp.is_active)
      return res.status(400).json({ message: "Account not activated" });

    const match = await bcrypt.compare(req.body.password, emp.password);

    if (!match)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: emp.emp_id, role: "Employee" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    //  IMPORTANT FIX
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




//logout can be handled on client side by deleting the token. For server-side token invalidation, we would need to implement a token blacklist which is beyond the current scope.

exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }

    await prisma.blacklistedToken.create({
      data: { token },
    });

    res.json({ message: "Logged out successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token)
      return res.status(401).json({ message: "No token" });

    // 🔥 CHECK BLACKLIST
    const blacklisted = await prisma.blacklistedToken.findUnique({
      where: { token },
    });

    if (blacklisted) {
      return res.status(401).json({ message: "Token expired (logged out)" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();

  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};