import { Pack } from '@/types';
import { loadPackIntoDb } from './database';

// Import all pack JSON files
import jsFundamentals from '@/data/packs/js-fundamentals.json';
import reactPatterns from '@/data/packs/react-patterns.json';
import cssLayout from '@/data/packs/css-layout.json';
import typescriptEssentials from '@/data/packs/typescript-essentials.json';
import webPerformance from '@/data/packs/web-performance.json';

const ALL_PACKS: Pack[] = [
  jsFundamentals as Pack,
  reactPatterns as Pack,
  cssLayout as Pack,
  typescriptEssentials as Pack,
  webPerformance as Pack,
];

/**
 * Load all pre-made packs into the database.
 * Safe to call multiple times (uses INSERT OR REPLACE).
 */
export async function loadAllPacks(): Promise<void> {
  for (const pack of ALL_PACKS) {
    await loadPackIntoDb(pack);
  }
}

export function getAllPackData(): Pack[] {
  return ALL_PACKS;
}
