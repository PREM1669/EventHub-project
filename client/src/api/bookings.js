import { useMutation, useQuery } from '@tanstack/react-query'
import api from './axios'

export const useCreateBooking = () => useMutation({
  mutationFn: ({ eventId, seatIds }) => api.post('/bookings', { eventId, seatIds }).then((response) => response.data),
})

export const useMyBookings = () => useQuery({
  queryKey: ['myBookings'],
  queryFn: () => api.get('/bookings/mine').then((response) => response.data),
})

export const useBookingTickets = (bookingId, enabled = false) => useQuery({
  queryKey: ['bookingTickets', bookingId],
  queryFn: () => api.get(`/bookings/${bookingId}/tickets`).then((response) => response.data),
  enabled: Boolean(bookingId) && enabled,
})
