import { Router } from 'express';
import { getTrips, updateTripStatus, getTripHaltLogs, } from '../controllers/tripsController.js';
const router = Router();
router.get('/', getTrips);
router.patch('/:id/status', updateTripStatus);
router.get('/:tripRef/logs', getTripHaltLogs);
export default router;
