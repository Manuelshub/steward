/**
 * Append-only audit trail (ARCHITECTURE.md §6). One JSON line per cycle:
 * context -> draft -> outcome -> txid. This is both a debugging aid and the judging asset
 * that makes the trust model visible in the web UI (E5).
 */
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { AuditEntry } from "@steward/core";
import type { AuditSink } from "./cycle.js";

/** JSON replacer that serializes bigint amounts as decimal strings. */
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

/** An AuditSink that appends newline-delimited JSON to `path`. */
export function fileAuditSink(path: string): AuditSink {
  return async (entry: AuditEntry) => {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, JSON.stringify(entry, bigintReplacer) + "\n");
  };
}

/** An AuditSink that logs a one-line summary to the console. */
export function consoleAuditSink(): AuditSink {
  return (entry: AuditEntry) => {
    const outcome = "rejected" in entry.outcome ? `rejected: ${entry.outcome.reason}` : `tx ${entry.txid ?? "(no-op)"}`;
    console.log(`[${entry.timestamp}] cycle -> ${outcome}`);
  };
}
