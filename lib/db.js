// lib/db.js
// Client Neon pour accéder à la base Postgres Prime5

const { neon } = require("@neondatabase/serverless");

// essaie d'abord DB_url (ton nom), puis fallback sur DATABASE_URL si un jour tu l'utilises
const connectionString = process.env.DB_url || process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "Aucune variable DB_url ou DATABASE_URL n'est définie dans les variables d'environnement."
  );
  throw new Error(
    "DB connection string manquante (DB_url / DATABASE_URL non définies)."
  );
}

const sql = neon(connectionString);

module.exports = sql;
