import { Router } from 'express';
import { getHalts, createHalt } from '../controllers/haltsController.js';

const router = Router();

router.get('/', getHalts);
router.post('/', createHalt);

export default router;
