import { Router } from 'express';
import { getSchedules, createSchedule, updateSchedule, } from '../controllers/schedulesController.js';
const router = Router();
router.get('/', getSchedules);
router.post('/', createSchedule);
router.put('/:id', updateSchedule);
export default router;
