// api/pronos/delete.js
// Supprime un prono par id

const sql = require("../../lib/db");

// Helper pour lire le JSON du body (comme dans update/create)
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      if (!data) {
        return resolve({});
      }
      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

module.exports = async (req, res) => {
  // On accepte POST et DELETE pour plus de souplesse
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", "POST, DELETE");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    console.error("Invalid JSON body:", err);
    return res.status(400).json({
      error: "Invalid JSON body",
      details: err.message,
    });
  }

  const { id } = body || {};

  if (!id) {
    return res.status(400).json({ error: "Missing 'id' in body" });
  }

  try {
    // On récupère la ligne avant suppression pour la renvoyer
    const existing = await sql`
      SELECT
        id,
        sport,
        league,
        match,
        market,
        selection,
        odds,
        kickoff,
        status,
        confidence,
        bookmaker,
        implied_prob,
        model_prob,
        edge,
        fair_odds,
        note,
        home_score,
        away_score
      FROM pronos
      WHERE id = ${id};
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Prono not found" });
    }

    const prono = existing[0];

    await sql`
      DELETE FROM pronos
      WHERE id = ${id};
    `;

    return res.status(200).json({
      deleted_at: new Date().toISOString(),
      prono,
    });
  } catch (error) {
    console.error("Error deleting prono:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete prono",
      details: error.message,
    });
  }
};

