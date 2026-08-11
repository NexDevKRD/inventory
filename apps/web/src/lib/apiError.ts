/** Pulls the API's `{ error: { message } }` envelope out of an axios failure. */
export function extractErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.error?.message ?? fallback;
}
