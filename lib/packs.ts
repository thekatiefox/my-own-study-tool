import { Pack } from '@/types';
import { loadPackIntoDb } from './database';

// Import all pack JSON files
import jsFundamentals from '@/data/packs/js-fundamentals.json';
import reactPatterns from '@/data/packs/react-patterns.json';
import cssLayout from '@/data/packs/css-layout.json';
import typescriptEssentials from '@/data/packs/typescript-essentials.json';
import webPerformance from '@/data/packs/web-performance.json';
import buildTools from '@/data/packs/build-tools.json';
import typescriptAdvanced from '@/data/packs/typescript-advanced.json';
import codeReview from '@/data/packs/code-review.json';
import systemDesignFe from '@/data/packs/system-design-fe.json';
import frontendArchitecture from '@/data/packs/frontend-architecture.json';
import reactAdvanced from '@/data/packs/react-advanced.json';
import codeReviewAdvanced from '@/data/packs/code-review-advanced.json';
import authentication from '@/data/packs/authentication.json';
import authenticationAdvanced from '@/data/packs/authentication-advanced.json';

const ALL_PACKS: Pack[] = [
  jsFundamentals as Pack,
  reactPatterns as Pack,
  cssLayout as Pack,
  typescriptEssentials as Pack,
  webPerformance as Pack,
  buildTools as Pack,
  typescriptAdvanced as Pack,
  codeReview as Pack,
  codeReviewAdvanced as Pack,
  systemDesignFe as Pack,
  frontendArchitecture as Pack,
  reactAdvanced as Pack,
  authentication as Pack,
  authenticationAdvanced as Pack,
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
