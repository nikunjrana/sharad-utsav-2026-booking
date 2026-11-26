import { INITIAL_STOCK } from "@/domain/catalog";
import type { BookingRecord, StockItem } from "@/domain/types";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

type StockMap = Record<StockItem, number>;

interface StoreState {
  stock: StockMap;
  bookings: Map<string, BookingRecord>;
  idempotency: Map<string, string>;
}

declare global {
  var __festivalStore: StoreState | undefined;
  var __festivalDbReady: Promise<void> | undefined;
}

const STOCK_KEYS = Object.keys(INITIAL_STOCK) as StockItem[];

function createState(): StoreState {
  return {
    stock: { ...INITIAL_STOCK },
    bookings: new Map(),
    idempotency: new Map(),
  };
}

function memory(): StoreState {
  if (!globalThis.__festivalStore) {
    globalThis.__festivalStore = createState();
  }
  return globalThis.__festivalStore;
}

function databaseUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    null
  );
}

function sqlClient() {
  const url = databaseUrl();
  if (!url) return null;
  return neon(url);
}

/** True when Neon (or other DATABASE_URL) is configured for durable stock. */
export function usingRedis(): boolean {
  return databaseUrl() !== null;
}

export function usingDatabase(): boolean {
  return databaseUrl() !== null;
}

async function ensureSchema(): Promise<void> {
  const sql = sqlClient();
  if (!sql) return;

  if (!globalThis.__festivalDbReady) {
    globalThis.__festivalDbReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS festival_stock (
          id TEXT PRIMARY KEY DEFAULT 'default',
          data JSONB NOT NULL,
          version INT NOT NULL DEFAULT 0
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS festival_bookings (
          id TEXT PRIMARY KEY,
          idempotency_key TEXT UNIQUE,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      const rows = await sql`SELECT id FROM festival_stock WHERE id = 'default'`;
      if (rows.length === 0) {
        await sql`
          INSERT INTO festival_stock (id, data, version)
          VALUES ('default', ${JSON.stringify(INITIAL_STOCK)}::jsonb, 0)
        `;
      }
    })();
  }

  await globalThis.__festivalDbReady;
}

async function loadStockFromDb(): Promise<{ stock: StockMap; version: number }> {
  const sql = sqlClient()!;
  await ensureSchema();
  const rows = await sql`SELECT data, version FROM festival_stock WHERE id = 'default'`;
  const data = (rows[0]?.data ?? INITIAL_STOCK) as StockMap;
  const version = Number(rows[0]?.version ?? 0);
  const stock = { ...INITIAL_STOCK, ...data };
  memory().stock = stock;
  return { stock, version };
}

export async function getStock(): Promise<StockMap> {
  if (!sqlClient()) return { ...memory().stock };
  const { stock } = await loadStockFromDb();
  return stock;
}

export async function getBooking(id: string): Promise<BookingRecord | null> {
  const sql = sqlClient();
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT data FROM festival_bookings WHERE id = ${id}`;
    if (rows[0]?.data) return rows[0].data as BookingRecord;
  }
  return memory().bookings.get(id) ?? null;
}

export async function findByIdempotency(key: string): Promise<BookingRecord | null> {
  const sql = sqlClient();
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      SELECT data FROM festival_bookings WHERE idempotency_key = ${key}
    `;
    if (rows[0]?.data) return rows[0].data as BookingRecord;
  }
  const id = memory().idempotency.get(key);
  if (!id) return null;
  return memory().bookings.get(id) ?? null;
}

function applyNeed(
  stock: StockMap,
  needed: Partial<Record<StockItem, number>>
): { ok: true; next: StockMap } | { ok: false; errors: string[] } {
  const next = { ...stock };
  const errors: string[] = [];

  for (const key of STOCK_KEYS) {
    const need = needed[key] ?? 0;
    if (need <= 0) continue;
    const have = next[key] ?? 0;
    if (have < need) {
      errors.push(
        have === 0
          ? `${key} is sold out.`
          : `Not enough stock for ${key}: need ${need}, have ${have}.`
      );
    }
  }
  if (errors.length) return { ok: false, errors };

  for (const key of STOCK_KEYS) {
    const need = needed[key] ?? 0;
    if (need > 0) next[key] = (next[key] ?? 0) - need;
  }
  return { ok: true, next };
}

/**
 * Check stock, decrement, and save booking.
 * Neon + optimistic version lock so stock survives cold starts and concurrent checkouts.
 */
export async function checkoutWithStock(params: {
  needed: Partial<Record<StockItem, number>>;
  booking: Omit<BookingRecord, "id" | "createdAt">;
  idempotencyKey?: string;
}): Promise<{ ok: true; booking: BookingRecord } | { ok: false; errors: string[] }> {
  if (params.idempotencyKey) {
    const existing = await findByIdempotency(params.idempotencyKey);
    if (existing) return { ok: true, booking: existing };
  }

  const sql = sqlClient();

  if (!sql) {
    const applied = applyNeed({ ...memory().stock }, params.needed);
    if (!applied.ok) return applied;
    memory().stock = applied.next;

    const booking: BookingRecord = {
      ...params.booking,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    memory().bookings.set(booking.id, booking);
    if (params.idempotencyKey) memory().idempotency.set(params.idempotencyKey, booking.id);
    return { ok: true, booking };
  }

  await ensureSchema();

  for (let attempt = 0; attempt < 12; attempt++) {
    const { stock, version } = await loadStockFromDb();
    const applied = applyNeed(stock, params.needed);
    if (!applied.ok) return applied;

    const updated = await sql`
      UPDATE festival_stock
      SET data = ${JSON.stringify(applied.next)}::jsonb,
          version = version + 1
      WHERE id = 'default' AND version = ${version}
      RETURNING version
    `;

    if (updated.length === 0) {
      await new Promise((r) => setTimeout(r, 20 + attempt * 15));
      continue;
    }

    memory().stock = applied.next;

    const booking: BookingRecord = {
      ...params.booking,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    try {
      await sql`
        INSERT INTO festival_bookings (id, idempotency_key, data)
        VALUES (
          ${booking.id},
          ${params.idempotencyKey ?? null},
          ${JSON.stringify(booking)}::jsonb
        )
      `;
    } catch {
      // Rare race on idempotency unique constraint — return existing booking.
      if (params.idempotencyKey) {
        const existing = await findByIdempotency(params.idempotencyKey);
        if (existing) return { ok: true, booking: existing };
      }
      throw new Error("Could not save booking — please try again.");
    }

    memory().bookings.set(booking.id, booking);
    if (params.idempotencyKey) memory().idempotency.set(params.idempotencyKey, booking.id);
    return { ok: true, booking };
  }

  return { ok: false, errors: ["Stock is busy — please try again."] };
}
