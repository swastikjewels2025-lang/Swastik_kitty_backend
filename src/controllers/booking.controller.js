import { Booking } from '../models/index.js';

export const createBookingController = async (req, res, next) => {
  try {
    const { 
      category = 'COINS', 
      itemName, 
      karat = '24K', 
      weightGrams, 
      unitPrice, 
      quantity = 1, 
      notes = '' 
    } = req.body;

    if (!itemName || !weightGrams || !unitPrice) {
      return res.fail('Item name, weight, and unit price are required.', 400, 'VALIDATION_ERROR');
    }

    const parsedWeight = parseFloat(weightGrams);
    const parsedUnitPrice = parseInt(unitPrice, 10);
    const parsedQty = parseInt(quantity, 10) || 1;

    if (isNaN(parsedWeight) || parsedWeight <= 0 || isNaN(parsedUnitPrice) || parsedUnitPrice <= 0) {
      return res.fail('Weight and unit price must be positive numbers.', 400, 'VALIDATION_ERROR');
    } 

    const totalAmount = parsedUnitPrice * parsedQty;
    const bookingId = `BKG-SW-${Date.now().toString().slice(-5)}`;

    const booking = await Booking.create({
      bookingId,
      userId: req.user._id,
      category,
      itemName: itemName.trim(),
      karat,
      weightGrams: parsedWeight,
      unitPrice: parsedUnitPrice,
      quantity: parsedQty,
      totalAmount,
      notes: notes ? notes.trim() : '',
      status: 'CONFIRMED'
    });

    return res.c
    reated({
      bookingId: booking.bookingId,
      status: booking.status,
      category: booking.category,
      itemName: booking.itemName,
      weightGrams: booking.weightGrams,
      quantity: booking.quantity,
      totalAmount: booking.totalAmount,
      createdAt: booking.createdAt.toISOString()
    }, 'Booking confirmed successfully.');
  } catch (error) {
    next(error);
  }
};

export const getMyBookingsController = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const formatted = bookings.map(b => ({
      id: b._id.toString(),
      bookingId: b.bookingId,
      category: b.category,
      itemName: b.itemName,
      karat: b.karat,
      weightGrams: b.weightGrams,
      unitPrice: b.unitPrice,
      quantity: b.quantity,
      totalAmount: b.totalAmount,
      status: b.status,
      createdAt: b.createdAt.toISOString()
    }));

    return res.ok({
      totalBookings: formatted.length,
      bookings: formatted
    }, 'Bookings retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

export const adminUpdateBookingStatusController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['CONFIRMED', 'DISPATCHED', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'];
    if (!status || !allowed.includes(status)) {
      return res.fail(`Status must be one of: ${allowed.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.fail('Booking not found.', 404, 'BOOKING_NOT_FOUND');
    }

    booking.status = status;
    await booking.save();

    return res.ok({
      bookingId: booking.bookingId,
      status: booking.status
    }, `Booking status updated to ${status}.`);
  } catch (error) {
    next(error);
  }
};
