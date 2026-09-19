import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from './axios'

export const useRoster = (eventId) => useQuery({
  queryKey: ['roster', eventId],
  queryFn: () => api.get(`/organizer/events/${eventId}/roster`).then((response) => response.data),
  enabled: Boolean(eventId),
  refetchInterval: 10000,
})

export const useAnalytics = (eventId) => useQuery({
  queryKey: ['analytics', eventId],
  queryFn: () => api.get(`/organizer/events/${eventId}/analytics`).then((response) => response.data),
  enabled: Boolean(eventId),
  refetchInterval: 10000,
})

export const useAnnouncements = (eventId) => useQuery({
  queryKey: ['organizerAnnouncements', eventId],
  queryFn: () => api.get(`/organizer/events/${eventId}/announcements`).then((response) => response.data),
  enabled: Boolean(eventId),
})

export const useSendAnnouncement = (eventId) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message) => api.post(`/organizer/events/${eventId}/announcements`, { message }).then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizerAnnouncements', eventId] }),
  })
}

export const exportRosterUrl = (eventId) => `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/organizer/events/${eventId}/roster/export`
