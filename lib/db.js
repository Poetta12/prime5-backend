// lib/db.js
// Client Neon pour accéder à la base Postgres Prime5

const { neon } = require("@neondatabase/serverless");

// On accepte plusieurs noms possibles de variable d'environnement :
// - DB_url          (ton nom perso)
// - DATABASE_URL    (nom "classique")
// - DB_DATABASE_URL (nom créé par l'intégration Neon dans Vercel)
const connectionString =
  process.env.DB_url ||
  process.env.DATABASE_URL ||
  process.env.DB_DATABASE_URL;

if (!connectionString) {
  const msg =
    "Aucune variable DB_url, DATABASE_URL ou DB_DATABASE_URL n'est définie dans les variables d'environnement.";
  console.error(msg);
  throw new Error(
    "DB connection string manquante (DB_url / DATABASE_URL / DB_DATABASE_URL non définies)."
  );
}

const sql = neon(connectionString);

module.exports = sql;
