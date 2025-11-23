// api/pronos/update.js
// Met à jour le statut et/ou le score d'un prono

const sql = require("../../lib/db"); // même lib que les autres endpoints

// Petit helper pour lire le JSON du body sur Vercel (Node "pur")
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
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.setHeader("Allow", "POST, PATCH");
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

  const { id, status, home_score, away_score } = body || {};

  if (!id) {
    return res.status(400).json({ error: "Missing 'id' in body" });
  }

  const allowedStatus = ["pending", "won", "lost", "void"];
  if (status && !allowedStatus.includes(status)) {
    return res.status(400).json({
      error: "Invalid status",
      allowed: allowedStatus,
    });
  }

  try {
    const rows = await sql`
      UPDATE pronos
      SET
        status      = COALESCE(${status}, status),
        home_score  = COALESCE(${home_score}, home_score),
        away_score  = COALESCE(${away_score}, away_score)
      WHERE id = ${id}
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

    if (rows.length === 0) {
      return res.status(404).json({ error: "Prono not found" });
    }

    const prono = rows[0];
    const now = new Date();
    const kickoffDate =
      prono.kickoff instanceof Date ? prono.kickoff : new Date(prono.kickoff);

    const isFinished = kickoffDate <= now;
    const isValidated = prono.status !== "pending";

    return res.status(200).json({
      updated_at: now.toISOString(),
      prono: {
        ...prono,
        is_finished: isFinished,
        is_validated: isValidated,
      },
    });
  } catch (error) {
    console.error("Error updating prono:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update prono",
      details: error.message,
    });
  }
};
