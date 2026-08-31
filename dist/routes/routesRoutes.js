import { Router } from 'express';
import { getRoutes, getRouteById, createRoute, updateRoute, } from '../controllers/routesController.js';
const router = Router();
router.get('/', getRoutes);
router.get('/:id', getRouteById);
router.post('/', createRoute);
router.put('/:id', updateRoute);
export default router;
