import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dispatchesApi } from '../api/dispatches';
import type { DispatchCreate } from '../types/master';

export const dispatchKeys = { list: (pid: number) => ['dispatches', pid] as const };

export const useDispatches = (pid: number) =>
  useQuery({ queryKey: dispatchKeys.list(pid), queryFn: () => dispatchesApi.list(pid) });

export const useCreateDispatch = (pid: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DispatchCreate) => dispatchesApi.create(pid, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: dispatchKeys.list(pid) }),
  });
};

export const useResendDispatch = (pid: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dispatchId: number) => dispatchesApi.resend(pid, dispatchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: dispatchKeys.list(pid) }),
  });
};
