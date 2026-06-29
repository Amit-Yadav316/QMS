// React Query hooks for the cube-tests feature. Reads: the project's cube samples
// plus the pours + labs the cast form needs. Strength results now arrive from the
// lab via its tokenised link, so there is no record-test mutation here — the QE
// casts samples and can copy/resend the lab's report link.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cubeTestsApi } from '../../api/cubeTests';
import type { CubeSampleCreate } from '../../types/master';

// Shared resource hooks (pours/labs) live in src/queries and are re-exported here
// for the cast form's dropdowns.
export { usePours } from '../../queries/pours';
export { useLabs } from '../../queries/labs';

export const cubeKeys = {
  samples: (pid: number) => ['cube-samples', pid] as const,
};

export const useCubeSamples = (pid: number) =>
  useQuery({ queryKey: cubeKeys.samples(pid), queryFn: () => cubeTestsApi.listSamples(pid) });

export const useCastSample = (pid: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { pourId: number; data: CubeSampleCreate }) =>
      cubeTestsApi.castSample(pid, vars.pourId, vars.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: cubeKeys.samples(pid) }),
  });
};

// Fetch the lab's report link to copy/share (mints a token if needed; no email).
export const useReportLink = (pid: number) =>
  useMutation({
    mutationFn: (sampleId: number) => cubeTestsApi.getReportLink(pid, sampleId),
  });

// Re-email the lab its report link; flips report_link_sent, so refresh samples.
export const useResendReportLink = (pid: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sampleId: number) => cubeTestsApi.resendReportLink(pid, sampleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: cubeKeys.samples(pid) }),
  });
};
