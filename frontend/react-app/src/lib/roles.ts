// Project-level role labels (app.models.auth.ProjectRole), used in the project
// workspace (Team tab, dashboards).

export const PROJECT_ROLE_LABELS: Record<string, string> = {
  CLIENT_LEAD: 'Client Lead',
  CONTRACTOR_LEAD: 'Contractor Lead',
  PROJECT_MANAGER: 'Project Manager',
  QUALITY_ENGINEER: 'Quality Engineer',
  SUPERVISOR: 'Supervisor',
};

export const projectRoleLabel = (role: string): string =>
  PROJECT_ROLE_LABELS[role] ?? role;

// A QE, project manager, or contractor (admin/user) may block/unblock an RMC or
// lab. Mirrors the backend `_BLOCKER_ROLES` in routers/suppliers.py.
export const canBlockEntities = (role: string | undefined): boolean =>
  role === 'QUALITY_ENGINEER' ||
  role === 'PROJECT_MANAGER' ||
  role === 'CONTRACTOR_ADMIN' ||
  role === 'CONTRACTOR_USER';
