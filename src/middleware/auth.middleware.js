<<<<<<< HEAD
const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

exports.isEmployee = (req, res, next) => {
  if (req.user.role !== "Employee") {
    return res.status(403).json({ message: "Employee only" });
  }
  next();
};
=======
const jwt        = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

// Fetches Keycloak's public key automatically
const client = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache:     true,
  rateLimit: true,
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

// Verify Keycloak JWT on every protected request
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, getSigningKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
}

// Role-based access control
function requireRole(role) {
  return (req, res, next) => {
    const roles = req.user?.realm_access?.roles || [];
    if (!roles.includes(role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${role}` });
    }
    next();
  };
}

const isAdmin = requireRole('admin');

function isSelfOrAdmin(req, res, next) {
  const roles = req.user?.realm_access?.roles || [];
  if (roles.includes('admin')) return next();

  const prisma = require('../config/db');
  prisma.employee.findFirst({
    where: { employeeCode: req.params.employeeCode, user: { keycloakId: req.user.sub } },
  })
  .then(emp => {
    if (!emp) return res.status(403).json({ error: 'Access denied' });
    next();
  })
  .catch(() => res.status(500).json({ error: 'Auth check failed' }));
}

module.exports = { authenticate, requireRole,isAdmin, isSelfOrAdmin };
>>>>>>> b4fb8b0bec2fd78eef6cc334bde511aa71d462c2
