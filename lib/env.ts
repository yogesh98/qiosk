import "server-only";

/** True when `dev_mode` is enabled (also accepts DEV_MODE). */
export function isDevMode(): boolean {
  const v = process.env.dev_mode ?? process.env.DEV_MODE;
  return v === "1" || v === "true" || v === "yes";
}
