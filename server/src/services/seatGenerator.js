const Seat = require('../models/Seat');

const ROWS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SEATS_PER_ROW = 10;

async function generateSeats(event) {
  const existingCount = await Seat.countDocuments({ event: event._id });
  if (existingCount > 0) return existingCount;

  const seats = [];
  let rowIndex = 0;
  let seatInRow = 1;

  for (const tier of event.priceTiers) {
    for (let index = 0; index < tier.seatCount; index += 1) {
      if (seatInRow > SEATS_PER_ROW) {
        rowIndex += 1;
        seatInRow = 1;
      }
      const row = ROWS[rowIndex];
      if (!row) throw new Error('Event capacity exceeds the supported seating chart size');
      seats.push({
        event: event._id,
        row,
        label: `${row}${seatInRow}`,
        tier: tier.name,
        price: tier.price
      });
      seatInRow += 1;
    }
  }

  await Seat.insertMany(seats);
  return seats.length;
}

module.exports = { generateSeats };
