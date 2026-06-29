import { QueryClient } from '@tanstack/react-query';

// App-wide React Query client. Conservative defaults for an internal tool:
// short stale window so data stays fresh between navigations, a single retry,
// and no refetch-on-focus (avoids surprise refetch storms when alt-tabbing).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
