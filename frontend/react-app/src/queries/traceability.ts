import { useQuery } from '@tanstack/react-query';
import { traceabilityApi } from '../api/traceability';

export const useTraceSearch = (pid: number, query: string) =>
  useQuery({
    queryKey: ['trace-search', pid, query],
    queryFn: () => traceabilityApi.search(pid, query),
  });

export const useTraceDetail = (pid: number, sampleId: number | null) =>
  useQuery({
    queryKey: ['trace-detail', pid, sampleId ?? 0],
    queryFn: () => traceabilityApi.detail(pid, sampleId as number),
    enabled: sampleId != null,
  });
