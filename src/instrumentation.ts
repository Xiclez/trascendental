/**
 * Runs once per server start: makes sure the database schema exists.
 * If Postgres isn't up yet (e.g. `npm run dev` before `npm run db:up`), retries
 * in the background instead of leaving the app without tables.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { migrate } = await import("@/lib/server/db");

  const attempt = async (n: number): Promise<void> => {
    try {
      await migrate();
    } catch (err) {
      if (n === 1) console.error("[db] sin conexión; reintentando cada 5 s…", (err as Error).message);
      if (n < 120) setTimeout(() => void attempt(n + 1), 5_000).unref();
    }
  };
  await attempt(1);
}
