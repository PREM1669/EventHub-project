import { create } from 'zustand'

export const useSeatStore = create((set) => ({
  seats: [],
  myHolds: [],
  setSeats: (seats) => set({ seats }),
  updateSeat: (seatId, updates) => set((state) => ({
    seats: state.seats.map((seat) => seat._id === seatId ? {
      ...seat,
      ...(typeof updates === 'string' ? { status: updates } : updates),
      ...(updates === 'available' || updates.status === 'available' ? { heldBy: null, holdExpiresAt: null } : {}),
    } : seat),
  })),
  addMyHold: (hold) => set((state) => ({
    myHolds: [...state.myHolds.filter((item) => item.seatId !== hold.seatId), hold],
  })),
  removeMyHold: (seatId) => set((state) => ({
    myHolds: state.myHolds.filter((hold) => hold.seatId !== seatId),
  })),
  clearMyHolds: () => set({ myHolds: [] }),
}))
