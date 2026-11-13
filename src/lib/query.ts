import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, notify } from './api';
export function useApi(path: string, enabled = true, interval?: number) {
  return useQuery({
    queryKey: [path],
    queryFn: () => api(path),
    enabled,
    refetchInterval: interval || false,
  });
}
export function useAction(
  action: (data: any) => Promise<any>,
  success?: (data: any) => void,
  message = 'Changes saved.',
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (data) => {
      client.invalidateQueries();
      if (message) notify(message);
      success?.(data);
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });
}
