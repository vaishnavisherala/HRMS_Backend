const jwt = require("jsonwebtoken");

exports.generateJWT = (user) => {
  return jwt.sign(
    { id: user.emp_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};