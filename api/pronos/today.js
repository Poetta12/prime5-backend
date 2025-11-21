// api/pronos/today.js

// Données mock pour tester l'API (pas encore de BDD)
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
    status: "pending", // pending | won | lost | void
    confidence: 4,     // 1–5
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
  },
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
    pronos: samplePronos,
  });
};
