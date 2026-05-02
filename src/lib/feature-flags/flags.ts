/**
 * Feature-flag registry.
 *
 * Source of truth for every flag the platform knows about. The
 * `church_feature_flags` DB table only stores _overrides_ — the
 * default value for every flag lives here, next to the code that
 * reads it. Adding a new flag is a one-liner here plus reading it
 * from `isFeatureEnabled(churchId, "your_new_flag")` at the call
 * site; there's no migration overhead.
 *
 * When you remove a flag from this registry, any lingering override
 * rows in the DB become inert (no one queries for that key anymore).
 * They can be cleaned up lazily — doing it immediately isn't worth a
 * migration.
 *
 * Categories exist purely so the super-admin UI can group them; they
 * have no runtime effect.
 */

export type FeatureFlagCategory =
  | "products" // whole-feature rollouts (new product areas)
  | "experiments" // A/B tests, behavioral tweaks
  | "access"; // per-church access grants (beta features, dogfooding)

export interface FeatureFlagDefinition {
  /** The flag key. Used in the DB and in all runtime checks. */
  key: string;
  /** Human-friendly label for the super-admin UI. */
  label: string;
  /** Longer description of what this flag gates. Shown on hover. */
  description: string;
  /** Fallback when no per-church override exists. */
  default: boolean;
  category: FeatureFlagCategory;
}

/**
 * The canonical flag list. Keys MUST be stable — changing a key
 * orphans every override row. When in doubt, add a new key and
 * deprecate the old one.
 */
export const FEATURE_FLAGS = {
  embedded_chat: {
    key: "embedded_chat",
    label: "Website Chat",
    description:
      "Website Chat product: the /embed.js script, Prospects dashboard, Website Chat settings tab, and all /api/embed/* endpoints. Included on every plan; this flag is the per-church kill switch — flip it off to disable a misbehaving church without a deploy.",
    default: true,
    category: "products",
  },
} as const satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * All flag keys as a runtime array — useful when iterating in UI
 * code or fetching overrides in bulk.
 */
export const FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];

export function isKnownFlagKey(key: string): key is FeatureFlagKey {
  return key in FEATURE_FLAGS;
}

export function getFlagDefinition(
  key: FeatureFlagKey
): (typeof FEATURE_FLAGS)[FeatureFlagKey] {
  return FEATURE_FLAGS[key];
}
