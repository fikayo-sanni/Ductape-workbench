/**
 * Dashboard fallback when no active tab can be restored, and landing after changing workspace or account.
 * Fresh login selects the dashboard through the auth store.
 */

/** Who is looking at which workspace, or null when nobody is signed in or there is no workspace yet. */
export function landingKey(userId: string | null | undefined, workspaceId: string | null | undefined): string | null {
  return userId && workspaceId ? `${userId}:${workspaceId}` : null;
}

/** Whether to open the dashboard now: only once the saved tabs have loaded, and only when the person or workspace is not the one already shown. */
export function shouldOpenDashboard(shownFor: string | null, now: string | null, hydrated: boolean): boolean {
  return hydrated && now !== null && now !== shownFor;
}
