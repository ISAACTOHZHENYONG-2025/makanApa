// Shared Firestore setup for the db:* scripts. Uses the Admin SDK with a service-account key,
// because firestore.rules make venues read-only for browsers.

import * as fs from "fs";
import * as path from "path";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      process.env[key] = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

// FIREBASE_SERVICE_ACCOUNT (or GOOGLE_APPLICATION_CREDENTIALS) is the path to the JSON key from
// Firebase console > Project settings > Service accounts > Generate new private key.
export function connectFirestore() {
  loadEnvLocal();
  if (getApps().length > 0) return getFirestore(getApp());

  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    console.error("Missing service account. Set FIREBASE_SERVICE_ACCOUNT in .env.local to the path of the Firebase service-account JSON key.");
    process.exit(1);
  }
  const resolved = path.resolve(process.cwd(), keyPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Service account key not found at ${resolved}.`);
    process.exit(1);
  }
  return getFirestore(initializeApp({ credential: cert(resolved) }));
}

export function runScript(main: () => Promise<void>) {
  main().then(
    () => process.exit(0),
    (err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    },
  );
}
