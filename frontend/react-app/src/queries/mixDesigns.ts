import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mixDesignsApi } from '../api/mixDesigns';
import type { MixDesignCreate } from '../types/master';

export const mixDesignKeys = {
  list: (pid: number) => ['mix-designs', pid] as const,
  approvedGrades: (pid: number) => ['mix-designs', pid, 'approved-grades'] as const,
};

export const useMixDesigns = (pid: number) =>
  useQuery({ queryKey: mixDesignKeys.list(pid), queryFn: () => mixDesignsApi.list(pid) });

// Grades a pour may use (those with an approved mix design).
export const useApprovedGrades = (pid: number) =>
  useQuery({
    queryKey: mixDesignKeys.approvedGrades(pid),
    queryFn: () => mixDesignsApi.approvedGrades(pid),
  });

export const useCreateMixDesign = (pid: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MixDesignCreate) => mixDesignsApi.create(pid, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mixDesignKeys.list(pid) });
      // A newly-approved mix may unlock a grade for pouring.
      void qc.invalidateQueries({ queryKey: mixDesignKeys.approvedGrades(pid) });
    },
  });
};
