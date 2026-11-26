import { INITIAL_STOCK } from "@/domain/catalog";
import type { BookingRecord, StockItem } from "@/domain/types";
import { randomUUID } from "crypto";

type StockMap = Record<StockItem, number>;

interface StoreState {
  stock: StockMap;
  bookings: Map<string, BookingRecord>;
  idempotency: Map<string, string>; // key → booking id
}

declare global {
  var __festivalStore: StoreState | undefined;
}

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

const STOCK_KEYS = Object.keys(INITIAL_STOCK) as StockItem[];

async function redisGetStock(): Promise<StockMap | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(`${url}/get/festival:stock`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result: string | null };
  if (!data.result) {
    // Seed
    await redisSetStock({ ...INITIAL_STOCK });
    return { ...INITIAL_STOCK };
  }
  return JSON.parse(data.result) as StockMap;
}

async function redisSetStock(stock: StockMap): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  await fetch(`${url}/set/festival:stock/${encodeURIComponent(JSON.stringify(stock))}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

/** Simple Redis lock via SET NX for checkout races when Redis is configured. */
async function withRedisLock<T>(fn: () => Promise<T>): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return fn();

  const lockKey = "festival:lock";
  for (let attempt = 0; attempt < 20; attempt++) {
    const set = await fetch(
      `${url}/set/${lockKey}/1?NX=true&EX=5`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    const body = (await set.json()) as { result: string | null };
    if (body.result === "OK") {
      try {
        return await fn();
      } finally {
        await fetch(`${url}/del/${lockKey}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
      }
    }
    await new Promise((r) => setTimeout(r, 50 + attempt * 20));
  }
  throw new Error("Could not acquire stock lock — please try again.");
}

export async function getStock(): Promise<StockMap> {
  const remote = await redisGetStock();
  if (remote) return remote;
  return { ...memory().stock };
}

export async function getBooking(id: string): Promise<BookingRecord | null> {
  return memory().bookings.get(id) ?? null;
}

export async function findByIdempotency(key: string): Promise<BookingRecord | null> {
  const id = memory().idempotency.get(key);
  if (!id) return null;
  return memory().bookings.get(id) ?? null;
}

/**
 * Atomically check stock and decrement, then save booking.
 * Uses Redis lock when configured; otherwise process-local mutex via sync code.
 */
export async function checkoutWithStock(params: {
  needed: Partial<Record<StockItem, number>>;
  booking: Omit<BookingRecord, "id" | "createdAt">;
  idempotencyKey?: string;
}): Promise<
  | { ok: true; booking: BookingRecord }
  | { ok: false; errors: string[] }
> {
  if (params.idempotencyKey) {
    const existing = await findByIdempotency(params.idempotencyKey);
    if (existing) return { ok: true, booking: existing };
  }

  return withRedisLock(async () => {
    const stock = (await redisGetStock()) ?? { ...memory().stock };
    const errors: string[] = [];

    for (const key of STOCK_KEYS) {
      const need = params.needed[key] ?? 0;
      if (need <= 0) continue;
      const have = stock[key] ?? 0;
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
      const need = params.needed[key] ?? 0;
      if (need > 0) stock[key] = (stock[key] ?? 0) - need;
    }

    await redisSetStock(stock);
    memory().stock = { ...stock };

    const booking: BookingRecord = {
      ...params.booking,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    memory().bookings.set(booking.id, booking);
    if (params.idempotencyKey) {
      memory().idempotency.set(params.idempotencyKey, booking.id);
    }
    return { ok: true, booking };
  });
}

export function usingRedis(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
