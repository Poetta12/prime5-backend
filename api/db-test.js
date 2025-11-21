// api/db-test.js
// Vérifie que la connexion Neon/Postgres fonctionne

const sql = require("../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const rows = await sql`SELECT NOW() AS now`;
    return res.status(200).json({
      status: "ok",
      source: "neon-postgres",
      now: rows[0]?.now,
    });
  } catch (error) {
    console.error("DB test error:", error);
    return res.status(500).json({
      status: "error",
      message: "DB connection failed",
      error: error.message,
    });
  }
};
