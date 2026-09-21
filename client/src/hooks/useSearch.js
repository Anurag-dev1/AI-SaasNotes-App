import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

export const useKeywordSearch = (query, page = 1) => {
  return useQuery({
    queryKey: ['search', 'keyword', query, page],
    queryFn: async () => {
      const { data } = await api.get('/search', { params: { q: query, page } });
      return data;
    },
    enabled: !!query,
  });
};

export const useSemanticSearch = () => {
  return useMutation({
    mutationFn: async ({ query, limit }) => {
      const { data } = await api.post('/search/semantic', { query, limit });
      return data.results;
    },
  });
};
