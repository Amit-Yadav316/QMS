import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mixDesignsApi } from '../api/mixDesigns';
import type { MixDesignCreate } from '../types/master';

export const mixDesignKeys = { list: (pid: number) => ['mix-designs', pid] as const };

export const useMixDesigns = (pid: number) =>
  useQuery({ queryKey: mixDesignKeys.list(pid), queryFn: () => mixDesignsApi.list(pid) });

export const useCreateMixDesign = (pid: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MixDesignCreate) => mixDesignsApi.create(pid, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: mixDesignKeys.list(pid) }),
  });
};
