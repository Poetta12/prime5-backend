// api/pronos/today.js

// Données mock pour tester l'API (pas encore de BDD)
// Schéma d'un prono :
// - id, sport, league, match
// - market, selection, odds, kickoff
// - status, confidence
// - bookmaker, implied_prob, model_prob, edge, fair_odds, note

const samplePronos = [
  {
    id: 1,
    sport: "football",
    league: "Ligue 1",
    match: "PSG - OM",
    market: "over_2_5",
    selection: "Over 2.5 buts",
    odds: 1.85,
    kickoff: "2025-11-21T20:45:00Z",
    status: "pending",            // pending | won | lost | void
    confidence: 4,                // 1–5

    bookmaker: "pinnacle",
    implied_prob: 54.1,           // 1 / 1.85 ≈ 0.5405 -> 54.1 %
    model_prob: 59.0,             // probabilité estimée par le modèle
    edge: 4.9,                    // model_prob - implied_prob
    fair_odds: 1.69,              // 1 / (model_prob/100)
    note: "Les deux équipes dépassent 3 buts en moyenne sur leurs 5 derniers matchs. Le modèle voit 59% de chances pour l'Over 2.5 contre 54% implicite dans la cote."
  },
  {
    id: 2,
    sport: "football",
    league: "Premier League",
    match: "Arsenal - Chelsea",
    market: "btts",
    selection: "Both teams to score",
    odds: 1.95,
    kickoff: "2025-11-21T21:00:00Z",
    status: "pending",
    confidence: 3,

    bookmaker: "betfair",
    implied_prob: 51.3,           // 1 / 1.95 ≈ 0.5128 -> 51.3 %
    model_prob: 56.5,
    edge: 5.2,
    fair_odds: 1.77,
    note: "Arsenal et Chelsea marquent dans plus de 70% de leurs matchs récents, le modèle estime 56.5% de probabilité que les deux équipes marquent."
  }
];

module.exports = (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // date ISO du jour en YYYY-MM-DD (UTC)
  const today = new Date().toISOString().slice(0, 10);

  return res.status(200).json({
    date: today,
    count: samplePronos.length,
    pronos: samplePronos
  });
};
