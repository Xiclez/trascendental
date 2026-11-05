// npm run stripe:listen — Stripe CLI (Docker) forwarding TEST webhooks to http://localhost:3000.
// Refuses live keys so real payments never hit the local machine.
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

let env = "";
try {
  env = readFileSync(".env.local", "utf8");
} catch {
  console.error("Falta .env.local (copia .env.example y llénalo).");
  process.exit(1);
}
const key = env.match(/^STRIPE_SECRET_KEY=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
if (!/^(sk|rk)_test_/.test(key)) {
  console.error("STRIPE_SECRET_KEY en .env.local debe ser de prueba (sk_test_ o rk_test_). No uses claves live en local.");
  process.exit(1);
}

console.log("Copia el 'webhook signing secret' (whsec_…) a STRIPE_WEBHOOK_SECRET en .env.local y reinicia `npm run dev`.\n");
const child = spawn(
  "docker",
  ["compose", "--env-file", ".env.local", "-f", "docker-compose.dev.yml", "--profile", "stripe", "run", "--rm", "stripe"],
  { stdio: "inherit", shell: process.platform === "win32" },
);
child.on("exit", (code) => process.exit(code ?? 0));
