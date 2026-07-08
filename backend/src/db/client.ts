import "dotenv/config";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — create backend/.env (see .env.example)");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

// CockroachDB's VECTOR type takes a '[0.1,0.2,...]' literal; pg has no
// native encoder for it, so vectors travel as strings with a ::vector cast.
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export function fromVectorLiteral(literal: string): number[] {
  return JSON.parse(literal);
}
