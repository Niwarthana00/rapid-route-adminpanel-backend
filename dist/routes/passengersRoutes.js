import { Router } from 'express';
import { getPassengers } from '../controllers/passengersController.js';
const router = Router();
router.get('/', getPassengers);
export default router;
