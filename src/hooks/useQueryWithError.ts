import { useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect } from "react";
import { perfMonitor } from "@/lib/performanceMonitor";

interface UseQueryWithErrorOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  errorMessage?: string;
  showToast?: boolean;
  /** Label for performance monitoring (if provided, query will be monitored) */
  perfLabel?: string;
}

export function useQueryWithError<TData, TError = Error>({
  queryKey,
  queryFn,
  errorMessage = "Erro ao carregar dados",
  showToast = true,
  perfLabel,
  ...options
}: UseQueryWithErrorOptions<TData, TError>) {
  // Wrap queryFn with performance monitoring if label provided
  const wrappedQueryFn = async () => {
    if (perfLabel && perfMonitor.isEnabled()) {
      return perfMonitor.measureAsync(perfLabel, queryFn);
    }
    return queryFn();
  };

  const query = useQuery<TData, TError>({
    queryKey,
    queryFn: wrappedQueryFn,
    ...options,
  });

  useEffect(() => {
    if (query.error && showToast) {
      const message = query.error instanceof Error ? query.error.message : errorMessage;
      toast.error(message);
    }
  }, [query.error, errorMessage, showToast]);

  return {
    ...query,
    hasError: !!query.error,
    retry: query.refetch,
  };
}
