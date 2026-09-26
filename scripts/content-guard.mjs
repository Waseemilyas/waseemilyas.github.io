#!/usr/bin/env node
// Content guardrail scanner enforcing AGENTS.md §1 across source files.
//
// Dependency-free (Node built-ins only).
// This is a public repository where every commit publishes to the open internet.
// Automated enforcement of standing content guardrails:
//   - No commercially sensitive detail: currency amounts, day rates, hourly rates,
//     retainer fees, contract terms/values, profit margins, commercial revenue.
//   - No security exposure: internal filesystem paths (/opt, /home, /Users, etc., C:\),
//     IP addresses (IPv4), internal/mesh domains (*.ts.net, .internal, .local, .lan).
//   - No non-allowlisted emails (only @automancer.uk and @waseemilyas.uk).
//   - No credentials or secrets: private key blocks, secret tokens, or credential
//     assignments in code or comments.
//
// Grandfathered content:
// Pre-existing content predating June 2026 rules (recorded in AGENTS.md §1 as
// a closed carve-out) carries scoped per-file exemptions for known grandfathered
// items in `src/_data/timeline.json` and `src/work/cs-icommit.md`.
//
// Usage: node scripts/content-guard.mjs [--dir src]
// Exits 0 on clean scan; exits 1 listing every violation with file and line.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".mp3",
]);

export const ALLOWED_EMAIL_DOMAINS = ["automancer.uk", "waseemilyas.uk"];

/**
 * Closed carve-out per AGENTS.md §1 for pre-existing content approved in June 2026.
 * Specific rules exempted for specific grandfathered files only.
 */
export const GRANDFATHERED_EXEMPTIONS = {
  "_data/timeline.json": new Set(["guard/commercial-revenue"]),
  "src/_data/timeline.json": new Set(["guard/commercial-revenue"]),
  "work/cs-icommit.md": new Set(["guard/commercial-terms"]),
  "src/work/cs-icommit.md": new Set(["guard/commercial-terms"]),
};

function getExemptions(relPath) {
  const norm = normalize(relPath).replace(/\\/g, "/");
  const withoutSrc = norm.startsWith("src/") ? norm.slice(4) : norm;
  const withSrc = norm.startsWith("src/") ? norm : `src/${norm}`;
  const set = new Set();
  for (const s of [GRANDFATHERED_EXEMPTIONS[withoutSrc], GRANDFATHERED_EXEMPTIONS[withSrc]]) {
    if (s) {
      for (const item of s) set.add(item);
    }
  }
  return set;
}

function lineNumberAtIndex(content, index) {
  return content.slice(0, index).split("\n").length;
}

/** Recursively list every non-binary file under `root` as relative POSIX paths. */
export function walkSourceFiles(root) {
  const out = [];
  const visit = (rel) => {
    const abs = rel === "" ? root : join(root, rel);
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        visit(childRel);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (!BINARY_EXTENSIONS.has(ext)) {
          out.push(childRel);
        }
      }
    }
  };
  visit("");
  return out.sort();
}

/**
 * Scan a single file's content against content guardrails.
 * Returns an array of violations: { check, file, line, message }.
 */
export function checkContent(relPath, content) {
  const violations = [];
  const exemptions = getExemptions(relPath);

  const report = (ruleId, message, index) => {
    if (exemptions.has(ruleId)) return;
    const line = lineNumberAtIndex(content, index);
    violations.push({
      check: ruleId,
      file: relPath,
      line,
      message: `${message} (line ${line})`,
    });
  };

  // 1. Internal filesystem paths
  const pathRe = /(?:^|[\s"'`<(])(\/(?:opt|home|Users|etc|var)\/[a-zA-Z0-9_.-]+|[A-Za-z]:\\[a-zA-Z0-9_.\\]+)/g;
  for (const m of content.matchAll(pathRe)) {
    report("guard/filesystem-paths", `internal filesystem path found: "${m[1]}"`, m.index);
  }

  // 2. IP addresses (IPv4)
  const ipRe = /\b(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\b/g;
  for (const m of content.matchAll(ipRe)) {
    report("guard/network-ip", `IP address found: "${m[0]}"`, m.index);
  }

  // 3. Internal network domains
  const domainRe = /\b[a-zA-Z0-9.-]+\.(?:ts\.net|internal|local|lan)\b/gi;
  for (const m of content.matchAll(domainRe)) {
    report("guard/network-domain", `internal network domain found: "${m[0]}"`, m.index);
  }

  // 4. Currency amounts / pricing
  const currencyRe = /(?:£|\$|€)\s*\d+(?:[.,]\d+)*(?:\s*[kKmMbB]|\b)|\b\d+(?:[.,]\d+)*\s*(?:GBP|USD|EUR)\b/gi;
  for (const m of content.matchAll(currencyRe)) {
    report("guard/currency", `currency amount found: "${m[0]}"`, m.index);
  }

  // 5. Commercial rate/fee/margin/headcount terms
  const commTermsRe = /\b(?:day[- ]rates?|hourly[- ]rates?|daily[- ]rates?|retainer[- ]fees?|contract[- ]values?|profit[- ]margins?|headcounts?)\b/gi;
  for (const m of content.matchAll(commTermsRe)) {
    report("guard/commercial-terms", `commercial rate/fee/margin term found: "${m[0]}"`, m.index);
  }

  // 6. Commercial revenue statement
  const revRe = /\b(?:annual|business|client|company|quarterly|recurring|total)\s+revenue\b|\brevenue\s*(?:of|was|is|reached|target|growth)\b/gi;
  for (const m of content.matchAll(revRe)) {
    report("guard/commercial-revenue", `commercial revenue disclosure found: "${m[0]}"`, m.index);
  }

  // 7. Non-allowlisted email addresses
  const emailRe = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  for (const m of content.matchAll(emailRe)) {
    const email = m[0];
    const isAllowed = ALLOWED_EMAIL_DOMAINS.some(
      (d) => email.toLowerCase().endsWith(`@${d}`) || email.toLowerCase().endsWith(`.${d}`)
    );
    if (!isAllowed) {
      report("guard/email-allowlist", `non-allowlisted email found: "${email}"`, m.index);
    }
  }

  // 8. Credentials and secrets
  const privKeyRe = /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/g;
  for (const m of content.matchAll(privKeyRe)) {
    report("guard/credentials", `private key block detected`, m.index);
  }
  const tokenRe = /\b(?:AKIA[0-9A-Z]{16}|ghp_[0-9a-zA-Z]{20,}|glpat-[0-9a-zA-Z_-]{20})\b/g;
  for (const m of content.matchAll(tokenRe)) {
    report("guard/credentials", `secret token marker detected: "${m[0].slice(0, 4)}…"`, m.index);
  }
  const credAssignRe = /(?:password|passwd|api[-_]?key|secret[-_]?key|client[-_]?secret|access[-_]?token|auth[-_]?token|bearer\s+[a-zA-Z0-9_\-\.]+)\s*[:=]/gi;
  for (const m of content.matchAll(credAssignRe)) {
    report("guard/credentials", `credential assignment pattern detected: "${m[0]}"`, m.index);
  }

  // 9. Comments containing credential or client markers
  const commentRe = /<!--([\s\S]*?)-->|{#([\s\S]*?)#}/g;
  for (const m of content.matchAll(commentRe)) {
    const body = m[1] ?? m[2];
    const hit = body.match(
      /\b(?:password|passwd|api[-_]?key|secret[-_]?key|client[-_]?secret|auth[-_]?token|access[-_]?token|internal[-_]?only)\b|\bclient\s*[:=]/i
    );
    if (hit) {
      report("guard/comment-secrets", `credential or client marker found in comment: "${hit[0]}"`, m.index);
    }
  }

  return violations;
}

/**
 * Scan an entire directory tree for content guardrail violations.
 * Pure reads only. Returns { violations, stats }.
 */
export function runContentGuard({ dir = "src" } = {}) {
  const violations = [];
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return {
      violations: [
        {
          check: "guard/source",
          file: dir,
          line: 1,
          message: `source directory "${dir}" does not exist or is not a directory`,
        },
      ],
      stats: { files: 0 },
    };
  }

  const files = walkSourceFiles(dir);
  for (const file of files) {
    const abs = join(dir, file);
    const content = readFileSync(abs, "utf8");
    const displayPath = dir === "src" || dir === "." ? join(dir, file) : file;
    violations.push(...checkContent(displayPath, content));
  }

  return {
    violations,
    stats: { files: files.length },
  };
}

// ---------------------------------------------------------------------------
// CLI

function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const targetDir = flag("--dir") ?? "src";
  const { violations, stats } = runContentGuard({ dir: targetDir });

  if (violations.length > 0) {
    console.error(
      `content-guard: FAILED — ${violations.length} standing guardrail violation(s) (AGENTS.md §1)\n`
    );
    for (const v of violations) {
      console.error(`  [${v.check}] ${v.file}:${v.line}: ${v.message}`);
    }
    process.exit(1);
  }

  console.log(
    `content-guard: OK — ${stats.files} source files scanned; standing content guardrails pass (AGENTS.md §1)`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
