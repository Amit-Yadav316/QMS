import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects';
import { floorsApi } from '../api/floors';
import type { FloorGenerate } from '../types/master';

export const towerKeys = { list: (pid: number) => ['towers', pid] as const };
export const floorKeys = {
  list: (pid: number, towerId: number) => ['floors', pid, towerId] as const,
};

export const useProjectTowers = (pid: number) =>
  useQuery({ queryKey: towerKeys.list(pid), queryFn: () => projectsApi.towers(pid) });

export const useFloors = (pid: number, towerId: number | null) =>
  useQuery({
    queryKey: floorKeys.list(pid, towerId ?? 0),
    queryFn: () => floorsApi.list(pid, towerId as number),
    enabled: towerId != null,
  });

export const useGenerateFloors = (pid: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { towerId: number; data: FloorGenerate }) =>
      floorsApi.generate(pid, vars.towerId, vars.data),
    onSuccess: (_res, vars) =>
      qc.invalidateQueries({ queryKey: floorKeys.list(pid, vars.towerId) }),
  });
};
