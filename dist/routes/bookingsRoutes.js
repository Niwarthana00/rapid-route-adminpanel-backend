import { Router } from 'express';
import { getBookings, getBookingById, createBooking, cancelBooking, getSeatMap, } from '../controllers/bookingsController.js';
const router = Router();
router.get('/seat-map', getSeatMap);
router.get('/', getBookings);
router.get('/:id', getBookingById);
router.post('/', createBooking);
router.post('/:id/cancel', cancelBooking);
export default router;
