// api/pronos/upcoming.js
// Liste les pronos à venir (ou à partir d'une date donnée)

const sql = require("../../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const now = new Date().toISOString();

  // On lit les query params à la main (runtime Vercel, pas d'Express)
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fromParam = url.searchParams.get("from"); // ex: 2025-11-22
  const limitParam =
    url.searchParams.get("limit") || url.searchParams.get("max_rows");

  const MAX_DEFAULT = 100;
  const maxRows = Math.min(
    MAX_DEFAULT,
    limitParam ? parseInt(limitParam, 10) || MAX_DEFAULT : MAX_DEFAULT
  );

  let rows;
  let fromKickoffFilter;

  try {
    if (fromParam) {
      // Version "à partir de la date fournie"
      fromKickoffFilter = fromParam;

      rows = await sql`
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
        WHERE kickoff >= ${fromParam}
        ORDER BY kickoff ASC, id ASC
        LIMIT ${maxRows};
      `;
    } else {
      // Version "upcoming à partir de maintenant"
      fromKickoffFilter = "NOW()";

      rows = await sql`
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
        WHERE kickoff >= NOW()
        ORDER BY kickoff ASC, id ASC
        LIMIT ${maxRows};
      `;
    }

    // Calculs dérivés (comme sur /by-date)
    const enriched = rows.map((p) => {
      const kickoffDate =
        p.kickoff instanceof Date ? p.kickoff : new Date(p.kickoff);
      const isFinished = kickoffDate <= new Date();
      const isValidated = p.status !== "pending";

      return {
        ...p,
        is_finished: isFinished,
        is_validated: isValidated,
      };
    });

    return res.status(200).json({
      now_utc: now,
      filters: {
        from_kickoff: fromKickoffFilter,
        max_rows: maxRows,
      },
      count: enriched.length,
      pronos: enriched,
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
