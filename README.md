# EventHub

Event management platform monorepo.

| Area | Stack |
| --- | --- |
| Client | React, Vite, Tailwind CSS, React Router, Axios |
| Server | Express, MongoDB Atlas, Mongoose, Socket.IO |

## Setup

Setup instructions coming. Copy `server/.env.example` to `server/.env`, add your MongoDB Atlas connection string, and use separate random values for `JWT_SECRET` and `QR_SECRET`.

## Demo seed data

After MongoDB is available, run `npm run seed` from `server/` to create two demo users and two published events. These credentials are for local development only:

| Role | Email | Password |
| --- | --- | --- |
| Organizer | `organizer@eventhub.local` | `Organizer123!` |
| Attendee | `attendee@eventhub.local` | `Attendee123!` |
