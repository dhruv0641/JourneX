export const DEFAULT_APP_NAME = 'JournalX';

/** Keep the original default brand out of view until the rename migration runs. */
export function displayAppName(value: string | null | undefined): string {
  const name = value?.trim();
  return !name || name === 'NEXORA' ? DEFAULT_APP_NAME : name;
}
