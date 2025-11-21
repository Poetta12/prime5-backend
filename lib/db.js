// lib/db.js
// Client Neon pour accéder à la base Postgres Prime5

const { neon } = require("@neondatabase/serverless");

// Vercel / Neon ont créé une variable DATABASE_URL (voir Quickstart)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "DATABASE_URL n'est pas définie dans les variables d'environnement."
  );
}

// sql`SELECT ...` renverra directement les lignes
const sql = neon(connectionString);

module.exports = sql;
