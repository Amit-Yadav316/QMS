import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../api/catalog';

// Global reference catalog — changes rarely, so cache it generously.
export const useGrades = () =>
  useQuery({ queryKey: ['grades'], queryFn: () => catalogApi.grades(), staleTime: 5 * 60_000 });

export const useComponents = () =>
  useQuery({ queryKey: ['components'], queryFn: () => catalogApi.components(), staleTime: 5 * 60_000 });
