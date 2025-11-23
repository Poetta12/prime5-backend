// api/pronos/create.js
// Crée un nouveau prono dans la table "pronos"

const sql = require("../../lib/db");

// Helper pour lire le JSON du body (même logique que dans update.js)
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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  // Champs attendus pour créer un prono
  const {
    sport,
    league,
    match,
    market,
    selection,
    odds,
    kickoff,        // ISO string, ex: "2025-12-01T20:45:00Z"
    confidence,     // 1–5
    bookmaker,
    implied_prob,
    model_prob,
    edge,
    fair_odds,
    note,
    home_score,
    away_score,
  } = body || {};

  // Validation minimale
  const missing = [];
  if (!sport) missing.push("sport");
  if (!league) missing.push("league");
  if (!match) missing.push("match");
  if (!market) missing.push("market");
  if (!selection) missing.push("selection");
  if (odds == null) missing.push("odds");
  if (!kickoff) missing.push("kickoff");

  if (missing.length > 0) {
    return res.status(400).json({
      error: "Missing required fields",
      missing,
    });
  }

  // statut par défaut = "pending" si non fourni
  const status = body.status || "pending";

  try {
    const rows = await sql`
      INSERT INTO pronos (
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
      )
      VALUES (
        ${sport},
        ${league},
        ${match},
        ${market},
        ${selection},
        ${odds},
        ${kickoff},
        ${status},
        ${confidence},
        ${bookmaker},
        ${implied_prob},
        ${model_prob},
        ${edge},
        ${fair_odds},
        ${note},
        ${home_score},
        ${away_score}
      )
      RETURNING
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
        away_score;
    `;

    const prono = rows[0];

    const now = new Date();
    const kickoffDate =
      prono.kickoff instanceof Date ? prono.kickoff : new Date(prono.kickoff);

    const isFinished = kickoffDate <= now;
    const isValidated = prono.status !== "pending";

    return res.status(201).json({
      created_at: now.toISOString(),
      prono: {
        ...prono,
        is_finished: isFinished,
        is_validated: isValidated,
      },
    });
  } catch (error) {
    console.error("Error creating prono:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create prono",
      details: error.message,
    });
  }
};
