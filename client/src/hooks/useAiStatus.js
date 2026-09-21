import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export const useAiStatus = (noteId) => {
  return useQuery({
    queryKey: ['aiStatus', noteId],
    queryFn: async () => {
      const { data } = await api.get(`/notes/${noteId}/ai-status`);
      return data;
    },
    enabled: !!noteId,
    refetchInterval: (query) => {
      const status = query.state?.data?.aiStatus;
      if (status === 'pending' || status === 'processing') {
        return 3000;
      }
      return false;
    },
  });
};
