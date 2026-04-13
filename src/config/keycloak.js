const axios = require("axios");

const getAdminToken = async () => {
  const res = await axios.post(
    `${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
    new URLSearchParams({
      username:   process.env.KEYCLOAK_ADMIN_USER,
      password:   process.env.KEYCLOAK_ADMIN_PASSWORD,
      grant_type: "password",
      client_id:  "admin-cli",   // ← always admin-cli for master realm
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
  return res.data.access_token;
};

module.exports = { getAdminToken };