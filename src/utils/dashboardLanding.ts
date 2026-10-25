/**
 * When the workbench opens on the dashboard. It does so the first time a signed-in person has a workspace, and again each time either
 * changes: a switch of workspace, or a fresh login (as the same person or another). Signing out resets it, so the next login lands again.
 */

/** Who is looking at which workspace, or null when nobody is signed in or there is no workspace yet. */
export function landingKey(userId: string | null | undefined, workspaceId: string | null | undefined): string | null {
  return userId && workspaceId ? `${userId}:${workspaceId}` : null;
}

/** Whether to open the dashboard now: only once the saved tabs have loaded, and only when the person or workspace is not the one already shown. */
export function shouldOpenDashboard(shownFor: string | null, now: string | null, hydrated: boolean): boolean {
  return hydrated && now !== null && now !== shownFor;
}
