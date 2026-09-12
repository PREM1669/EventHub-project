import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from './axios'

export const useEvents = (filters) => useQuery({
  queryKey: ['events', filters],
  queryFn: () => api.get('/events', { params: filters }).then((response) => response.data),
})

export const useEvent = (id) => useQuery({
  queryKey: ['event', id],
  queryFn: () => api.get(`/events/${id}`).then((response) => response.data),
  enabled: Boolean(id),
})

export const useMyEvents = () => useQuery({
  queryKey: ['myEvents'],
  queryFn: () => api.get('/events/mine').then((response) => response.data),
})

export const useCreateEvent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/events', data).then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myEvents'] }),
  })
}

export const useUpdateEvent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/events/${id}`, data).then((response) => response.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myEvents'] })
      queryClient.invalidateQueries({ queryKey: ['event', variables.id] })
    },
  })
}

export const useDeleteEvent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/events/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myEvents'] }),
  })
}
