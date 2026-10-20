/** An error meant for the user: its message is shown as is. Anything else gets a generic message. */
export class UserError extends Error {}

export const SUPPORT_URL = 'github.com/cybertatar/tgminiappfigmaplugin/issues';

/** Text shown to the user for any error; unexpected ones are logged for bug reports. */
export function userMessage(e: unknown): string {
  if (e instanceof UserError) return e.message;
  console.error('[Native Kit]', e);
  return `Something went wrong. Please try again — if it keeps happening, report it at ${SUPPORT_URL}`;
}
