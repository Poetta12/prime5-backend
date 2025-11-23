// api/pronos/update.js
// Met à jour le statut et/ou le score d'un prono
// et détermine automatiquement le résultat pour certains marchés.

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

// Normalise un score éventuel (number ou string) -> number | null
function normalizeScore(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// Essaie de déduire un statut automatique à partir du marché / sélection / score
// - explicitStatus : si fourni et valide -> priorité absolue
// - currentStatus  : statut déjà stocké en BDD
function computeStatus({
  market,
  selection,
  currentStatus,
  homeScore,
  awayScore,
  explicitStatus,
}) {
  const allowedStatus = ["pending", "won", "lost", "void"];

  // 1) Si un statut explicite est fourni et valide -> on le respecte
  if (explicitStatus && allowedStatus.includes(explicitStatus)) {
    return explicitStatus;
  }

  // 2) Si pas de score complet -> on ne touche pas au statut
  if (homeScore === null || awayScore === null) {
    return currentStatus;
  }

  // 3) Si le prono est déjà jugé (won/lost/void) -> on ne change rien automatiquement
  if (currentStatus !== "pending") {
    return currentStatus;
  }

  const totalGoals = homeScore + awayScore;
  const mkt = (market || "").toLowerCase();
  const sel = (selection || "").toLowerCase();

  // ===== RÈGLE 1 : marchés de type "Over X" =====
  // On essaie d'abord de lire la valeur dans "market" (ex: "over_2_5", "over2.5")
  let overThreshold = null;

  const marketMatch = mkt.match(/over[_ ]?(\d+(?:[.,]\d+)?)/i);
  if (marketMatch && marketMatch[1]) {
    overThreshold = parseFloat(marketMatch[1].replace(",", "."));
  }

  // Sinon on tente dans la sélection (ex : "Over 2.5 buts")
  if (overThreshold === null) {
    const selMatch = sel.match(/over[^\d]*(\d+(?:[.,]\d+)?)/i);
    if (selMatch && selMatch[1]) {
      overThreshold = parseFloat(selMatch[1].replace(",", "."));
    }
  }

  if (overThreshold !== null) {
    // Logique simple : total > seuil => gagné, sinon perdu
    if (totalGoals > overThreshold) {
      return "won";
    } else {
      return "lost";
    }
  }

  // ===== RÈGLE 2 : marchés de type "BTTS" / "Both Teams To Score" =====
  const isBttsMarket =
    mkt === "btts" ||
    sel.includes("both teams to score") ||
    sel.includes("les deux équipes marquent");

  if (isBttsMarket) {
    if (homeScore > 0 && awayScore > 0) {
      return "won";
    } else {
      return "lost";
    }
  }

  // ===== RÈGLE PAR DÉFAUT =====
  // Marché non géré automatiquement -> on laisse le statut actuel
  return currentStatus;
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

  const { id, status: explicitStatus, home_score, away_score } = body || {};

  if (!id) {
    return res.status(400).json({ error: "Missing 'id' in body" });
  }

  const allowedStatus = ["pending", "won", "lost", "void"];
  if (explicitStatus && !allowedStatus.includes(explicitStatus)) {
    return res.status(400).json({
      error: "Invalid status",
      allowed: allowedStatus,
    });
  }

  // Normalisation des scores reçus
  const newHomeScore = normalizeScore(home_score);
  const newAwayScore = normalizeScore(away_score);

  try {
    // 1) On récupère d'abord le prono existant
    const existingRows = await sql`
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
      WHERE id = ${id};
    `;

    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Prono not found" });
    }

    const current = existingRows[0];

    // Scores finaux = nouveaux si fournis, sinon valeurs actuelles
    const finalHomeScore =
      newHomeScore !== null ? newHomeScore : current.home_score;
    const finalAwayScore =
      newAwayScore !== null ? newAwayScore : current.away_score;

    // Statut final (logique auto + éventuel override explicite)
    const finalStatus = computeStatus({
      market: current.market,
      selection: current.selection,
      currentStatus: current.status,
      homeScore: finalHomeScore,
      awayScore: finalAwayScore,
      explicitStatus,
    });

    // 2) On met à jour la ligne avec les valeurs calculées
    const updatedRows = await sql`
      UPDATE pronos
      SET
        status      = ${finalStatus},
        home_score  = ${finalHomeScore},
        away_score  = ${finalAwayScore}
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

    const prono = updatedRows[0];
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
