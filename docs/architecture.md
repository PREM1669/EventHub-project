# EventHub architecture diagram

```mermaid
flowchart TB
  subgraph Browser
    UI[React pages and components]
    Store[Zustand + React Query]
    Scanner[Camera or manual QR scanner]
    UI --> Store
    Scanner --> UI
  end

  UI -->|REST over HTTPS| Express[Express REST API]
  Store <-->|Socket.IO event rooms| Socket[Socket.IO server]
  Socket --> Express
  Express --> Mongo[(MongoDB Atlas)]
  Express --> Auth[JWT and role middleware]
  Express --> Booking[Booking transaction]
  Booking --> Seats[Seat state]
  Booking --> Tickets[Ticket records]
  Tickets --> QR[QR_SECRET signing]
  QR -->|QR image/token| UI
  Scanner -->|signed token| Express
  Express -->|verify signature and checkedIn flag| QR
```

## Main real-time events

- `seat-updated`: hold and release changes.
- `seats-booked`: seats committed by a booking transaction.
- `seats-released`: seats freed by an eligible cancellation.
- `announcement`: organizer messages for an event room.
- `checkin-update`: live checked-in count for dashboards and scanner pages.
