import { Router } from 'express';
import {
  getDashboardSummary,
  getLiveFleet,
  getActiveTrips,
  dispatchReplacement,
} from '../controllers/dashboardController.js';

const router = Router();

router.get('/summary', getDashboardSummary);
router.get('/live-fleet', getLiveFleet);
router.get('/active-trips', getActiveTrips);
router.post('/dispatch-replacement', dispatchReplacement);

export default router;
