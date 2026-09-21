import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export const useNotes = (page = 1, limit = 10, tag = null) => {
  return useQuery({
    queryKey: ['notes', { page, limit, tag }],
    queryFn: async () => {
      const params = { page, limit };
      if (tag) params.tags = tag;
      const { data } = await api.get('/notes', { params });
      return data;
    },
  });
};

export const useNote = (id) => {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: async () => {
      const { data } = await api.get(`/notes/${id}`);
      return data.note;
    },
    enabled: !!id,
  });
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteData) => {
      const { data } = await api.post('/notes', noteData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, noteData }) => {
      const { data } = await api.put(`/notes/${id}`, noteData);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/notes/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
};
