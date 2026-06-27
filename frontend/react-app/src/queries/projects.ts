import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects';

export const projectKeys = {
  list: () => ['projects'] as const,
  assigned: () => ['assigned-projects'] as const,
  detail: (id: number) => ['project', id] as const,
};

export const useProjects = () =>
  useQuery({ queryKey: projectKeys.list(), queryFn: () => projectsApi.list() });

export const useProjectDetail = (id: number) =>
  useQuery({ queryKey: projectKeys.detail(id), queryFn: () => projectsApi.detail(id) });

export const useAssignedProjects = () =>
  useQuery({ queryKey: projectKeys.assigned(), queryFn: () => projectsApi.assigned() });

export const useRespondToAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { pcId: number; accept: boolean }) =>
      vars.accept ? projectsApi.acceptAssigned(vars.pcId) : projectsApi.declineAssigned(vars.pcId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.assigned() });
      void qc.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
};
