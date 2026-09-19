const Seat = require('../models/Seat');

const ROWS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SEATS_PER_ROW = 10;

async function generateSeats(event) {
  const existingCount = await Seat.countDocuments({ event: event._id });
  if (existingCount > 0) return existingCount;

  const seats = [];
  let rowIndex = 0;
  let seatInRow = 1;

  const tiersByPrice = [...event.priceTiers].sort((a, b) => b.price - a.price);
  for (const tier of tiersByPrice) {
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

async function arrangeSeats(event) {
  const tierPrices = new Map(event.priceTiers.map((tier) => [tier.name, tier.price]));
  const seats = await Seat.find({ event: event._id }).sort({ row: 1, label: 1 });
  const seatsByTier = seats.reduce((groups, seat) => {
    groups[seat.tier] = [...(groups[seat.tier] || []), seat];
    return groups;
  }, {});
  const tierNames = Object.keys(seatsByTier).sort((first, second) => (
    (tierPrices.get(second) || 0) - (tierPrices.get(first) || 0)
  ));

  for (const seat of seats) {
    await Seat.updateOne({ _id: seat._id }, { label: `TEMP-${seat._id}` });
  }

  let rowIndex = 0;
  let seatInRow = 1;
  for (const tierName of tierNames) {
    for (const seat of seatsByTier[tierName]) {
      if (seatInRow > SEATS_PER_ROW) {
        rowIndex += 1;
        seatInRow = 1;
      }
      const row = ROWS[rowIndex];
      if (!row) throw new Error('Event capacity exceeds the supported seating chart size');
      await Seat.updateOne({ _id: seat._id }, { row, label: `${row}${seatInRow}` });
      seatInRow += 1;
    }
  }
}

module.exports = { arrangeSeats, generateSeats };
