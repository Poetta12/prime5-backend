// api/pronos/today.js

// Endpoint : pronos du jour en base Postgres (Neon)

const sql = require("../../lib/db"); // attention au chemin depuis /api/pronos

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // date ISO du jour en YYYY-MM-DD (UTC) pour l’info dans la réponse
  const today = new Date().toISOString().slice(0, 10);

  try {
    const rows = await sql`
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
        note
      FROM pronos
      WHERE kickoff::date = CURRENT_DATE
      ORDER BY kickoff ASC, id ASC;
    `;

    return res.status(200).json({
      date: today,
      count: rows.length,
      pronos: rows,
    });
  } catch (error) {
    console.error("Error fetching today's pronos:", error);

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to load today's pronos",
      // tu peux commenter la ligne suivante en prod si tu veux moins de détails
      details: error.message,
    });
  }
};
