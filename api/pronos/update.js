// api/pronos/update.js
// Met à jour le statut et/ou le score d'un prono

const sql = require("../../lib/db"); // même lib que les autres endpoints

module.exports = async (req, res) => {
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.setHeader("Allow", "POST, PATCH");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Vercel parse req.body en JSON si Content-Type: application/json
  const { id, status, home_score, away_score } = req.body || {};

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
        -- si la valeur JS est NULL/undefined => COALESCE garde l'ancienne valeur
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
