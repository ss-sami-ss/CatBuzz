// Smoke check for the local stack (T03): PostGIS in both databases, Redis policy, storage buckets.
// Usage: npm run infra:check  (after npm run infra:up). Exits non-zero on the first failed check.
import { execFileSync } from "node:child_process";

function compose(...args) {
  return execFileSync("docker", ["compose", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

const checks = [
  {
    name: "PostGIS in catbuzz",
    run: () => compose("exec", "-T", "db", "psql", "-U", "catbuzz", "-d", "catbuzz", "-tAc", "SELECT postgis_lib_version()"),
    expect: (out) => /^3\.\d+/.test(out),
  },
  {
    name: "PostGIS in catbuzz_test",
    run: () => compose("exec", "-T", "db", "psql", "-U", "catbuzz", "-d", "catbuzz_test", "-tAc", "SELECT postgis_lib_version()"),
    expect: (out) => /^3\.\d+/.test(out),
  },
  {
    name: "Redis noeviction (BullMQ)",
    run: () => compose("exec", "-T", "redis", "redis-cli", "CONFIG", "GET", "maxmemory-policy"),
    expect: (out) => out.split(/\s+/).includes("noeviction"),
  },
  {
    name: "Storage buckets",
    run: () => compose("exec", "-T", "storage", "sh", "-c", "echo s3.bucket.list | weed shell -master=127.0.0.1:9333"),
    expect: (out) => /catbuzz-private/.test(out) && /catbuzz-public/.test(out),
  },
];

let failed = false;
for (const check of checks) {
  try {
    const out = check.run();
    const ok = check.expect(out);
    console.log(`${ok ? "ok  " : "FAIL"} ${check.name}${ok ? "" : `\n     got: ${out}`}`);
    if (!ok) failed = true;
  } catch (error) {
    console.log(`FAIL ${check.name}\n     ${String(error.stderr || error.message).trim()}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
