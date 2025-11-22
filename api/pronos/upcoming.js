// api/pronos/upcoming.js
// Endpoint : prochains pronos à partir de maintenant (kickoff >= NOW)

const sql = require("../../lib/db"); // même client Neon que pour today.js

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const now = new Date().toISOString(); // pour info dans la réponse

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
      WHERE kickoff >= NOW()
      ORDER BY kickoff ASC, id ASC
      LIMIT 100;
    `;

    return res.status(200).json({
      now_utc: now,
      filters: {
        from_kickoff: "NOW()",
        max_rows: 100,
      },
      count: rows.length,
      pronos: rows,
    });
  } catch (error) {
    console.error("Error fetching upcoming pronos:", error);

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to load upcoming pronos",
      details: error.message,
    });
  }
};
