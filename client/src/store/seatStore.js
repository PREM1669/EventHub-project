import { create } from 'zustand'

export const useSeatStore = create((set) => ({
  seats: [],
  myHold: null,
  setSeats: (seats) => set({ seats }),
  updateSeat: (seatId, updates) => set((state) => ({
    seats: state.seats.map((seat) => seat._id === seatId ? {
      ...seat,
      ...(typeof updates === 'string' ? { status: updates } : updates),
      ...(updates === 'available' || updates.status === 'available' ? { heldBy: null, holdExpiresAt: null } : {}),
    } : seat),
  })),
  setMyHold: (myHold) => set({ myHold }),
  clearMyHold: () => set({ myHold: null }),
}))
