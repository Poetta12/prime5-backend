// api/pronos/history.js
// Historique des pronos sur une plage de dates : ?from=YYYY-MM-DD&to=YYYY-MM-DD
// + résumé statistique simple (strike rate, ROI unitaire)

const sql = require("../../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  // Défaut : dernier 30 jours jusqu'à aujourd'hui (UTC)
  const today = new Date().toISOString().slice(0, 10);

  // Si pas de "to" -> aujourd'hui
  const toDate = toParam || today;

  // Si pas de "from" -> 30 jours avant "to"
  let fromDate = fromParam;
  if (!fromDate) {
    const d = new Date(toDate + "T00:00:00Z");
    d.setDate(d.getDate() - 30);
    fromDate = d.toISOString().slice(0, 10);
  }

  // Validation format basique
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
    return res.status(400).json({
      error: "Invalid 'from' or 'to' format, expected YYYY-MM-DD",
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
      WHERE kickoff::date >= ${fromDate}
        AND kickoff::date <= ${toDate}
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

    // Calcul du résumé statistique
    let totalBets = 0;
    let won = 0;
    let lost = 0;
    let voidCount = 0;
    let pending = 0;

    let pnlUnits = 0; // P&L en unités (mise 1 par bet)
    let settledBetsForRoi = 0;

    for (const p of pronos) {
      totalBets += 1;

      const status = p.status;
      const oddsNum = p.odds !== null ? Number(p.odds) : null;

      if (status === "won") {
        won += 1;
        if (oddsNum && !Number.isNaN(oddsNum)) {
          // mise 1, retour = odds -> bénéfice = odds - 1
          pnlUnits += oddsNum - 1;
        }
        settledBetsForRoi += 1;
      } else if (status === "lost") {
        lost += 1;
        pnlUnits -= 1; // perte de la mise
        settledBetsForRoi += 1;
      } else if (status === "void") {
        voidCount += 1;
        // pas de gain ni perte
        settledBetsForRoi += 1;
      } else if (status === "pending") {
        pending += 1;
      }
    }

    const strikeRate =
      won + lost + voidCount > 0
        ? won / (won + lost + voidCount)
        : null;

    const unitRoi =
      settledBetsForRoi > 0 ? pnlUnits / settledBetsForRoi : null;

    return res.status(200).json({
      range: {
        from: fromDate,
        to: toDate,
      },
      now_utc: now.toISOString(),
      count: pronos.length,
      summary: {
        total_bets: totalBets,
        won,
        lost,
        void: voidCount,
        pending,
        strike_rate: strikeRate, // ex: 0.55 = 55%
        unit_roi: unitRoi,       // ex: 0.10 = +10% sur mise unitaire
      },
      pronos,
    });
  } catch (error) {
    console.error("Error fetching history pronos:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to load pronos history",
      details: error.message,
    });
  }
};
