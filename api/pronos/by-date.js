// api/pronos/by-date.js
// Récupère tous les pronos d'une date donnée (paramètre ?date=YYYY-MM-DD)

const sql = require("../../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // On parse l'URL pour récupérer ?date=...
  const url = new URL(req.url, `http://${req.headers.host}`);
  const dateParam = url.searchParams.get("date");

  // Si pas de date fournie => on prend la date du jour (UTC)
  const targetDate = dateParam || new Date().toISOString().slice(0, 10);

  // Validation basique du format YYYY-MM-DD si l'utilisateur en envoie une
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return res.status(400).json({
      error: "Invalid 'date' format, expected YYYY-MM-DD",
    });
  }

  const now = new Date();

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
        note,
        home_score,
        away_score
      FROM pronos
      WHERE kickoff::date = ${targetDate}
      ORDER BY kickoff ASC, id ASC;
    `;

    const pronos = rows.map((row) => {
      const kickoffDate =
        row.kickoff instanceof Date ? row.kickoff : new Date(row.kickoff);

      const isFinished = kickoffDate <= now;
      const isValidated = row.status !== "pending";

      return {
        ...row,
        is_finished: isFinished,
        is_validated: isValidated,
      };
    });

    return res.status(200).json({
      date: targetDate,
      now_utc: now.toISOString(),
      count: pronos.length,
      pronos,
    });
  } catch (error) {
    console.error("Error fetching pronos by date:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to load pronos for given date",
      details: error.message,
    });
  }
};
