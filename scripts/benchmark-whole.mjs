import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const BASE_URL = "http://127.0.0.1:3000";
const TARGETS = [10, 20];
const RUNS = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(
        `${BASE_URL}/api/whole?limit=1&includeReposts=true`,
        {
          cache: "no-store",
        },
      );
      if (res.ok || res.status >= 400) {
        return true;
      }
    } catch {
      // not ready
    }
    await sleep(500);
  }
  return false;
}

async function benchLimit(limit) {
  const times = [];
  for (let i = 1; i <= RUNS; i += 1) {
    const url = `${BASE_URL}/api/whole?limit=${limit}&includeReposts=true`;
    const t0 = performance.now();
    const res = await fetch(url, { cache: "no-store" });
    await res.text();
    const t1 = performance.now();
    const ms = Number((t1 - t0).toFixed(2));
    times.push({ run: i, ms, status: res.status });
    console.log(`limit=${limit} run=${i}: ${ms}ms status=${res.status}`);
  }

  const avg = Number(
    (times.reduce((sum, item) => sum + item.ms, 0) / times.length).toFixed(2),
  );
  const min = Math.min(...times.map((t) => t.ms));
  const max = Math.max(...times.map((t) => t.ms));

  return {
    limit,
    avg,
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    statuses: times.map((t) => t.status),
  };
}

async function main() {
  console.log("Starting dev server...");
  const child = spawn("npm run dev", [], {
    cwd: process.cwd(),
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", (buf) => {
    const s = String(buf);
    if (s.includes("Ready") || s.includes("ready")) {
      process.stdout.write("[dev] ready signal detected\n");
    }
  });

  child.stderr.on("data", (buf) => {
    const s = String(buf);
    if (s.toLowerCase().includes("error")) {
      process.stdout.write(`[dev-err] ${s}`);
    }
  });

  try {
    const ready = await waitForServer();
    if (!ready) {
      throw new Error("dev server did not become ready in time");
    }

    console.log("Server is ready. Running benchmarks...");
    const results = [];
    for (const limit of TARGETS) {
      results.push(await benchLimit(limit));
    }

    console.log("\nSummary");
    for (const r of results) {
      console.log(
        `limit=${r.limit}: avg=${r.avg}ms min=${r.min}ms max=${r.max}ms statuses=${r.statuses.join(",")}`,
      );
    }
  } finally {
    if (child.pid) {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    }
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err.message);
  process.exit(1);
});
