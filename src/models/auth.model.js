const pool = require("../config/db");

// 🔹 Check admin exists
exports.checkAdminExists = async () => {
  const res = await pool.query(
    `SELECT * FROM Employee WHERE role='Admin' LIMIT 1`
  );
  return res.rows.length > 0;
};

// 🔹 Create admin
exports.createAdmin = async ({ name, email, password }) => {
  await pool.query(
    `INSERT INTO Employee(name,email,password,role,is_verified,status)
     VALUES($1,$2,$3,'Admin',true,'Active')`,
    [name, email, password]
  );
};

exports.createEmployee = async (data) => {
  const { name, email, role, dep_id } = data;

  const res = await pool.query(
    `INSERT INTO Employee(name,email,role,dep_id,status,is_verified)
     VALUES($1,$2,$3,$4,'Inactive',false)
     RETURNING *`,
    [name, email, role, dep_id]
  );

  return res.rows[0];
};

exports.saveToken = async (emp_id, token, expiry) => {
  await pool.query(
    `INSERT INTO Activation_Token(emp_id,token,expiry)
     VALUES($1,$2,$3)`,
    [emp_id, token, expiry]
  );
};

exports.findToken = async (token) => {
  const res = await pool.query(
    `SELECT * FROM Activation_Token 
     WHERE token=$1 AND is_used=false`,
    [token]
  );
  return res.rows[0];
};

exports.activateUser = async (emp_id, password) => {
  await pool.query(
    `UPDATE Employee 
     SET password=$1, is_verified=true, status='Active'
     WHERE emp_id=$2`,
    [password, emp_id]
  );
};

exports.markTokenUsed = async (token) => {
  await pool.query(
    `UPDATE Activation_Token SET is_used=true WHERE token=$1`,
    [token]
  );
};

exports.findUserByEmail = async (email) => {
  const res = await pool.query(
    `SELECT * FROM Employee WHERE email=$1`,
    [email]
  );
  return res.rows[0];
};