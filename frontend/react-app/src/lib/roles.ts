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
