import { Router } from 'express';
import {
    getTaskCardSets,
    getTaskCardSetById,
    createTaskCardSet,
    updateTaskCardSet,
    deleteTaskCardSet,
} from '../controllers/taskCardSet.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.use(protect, adminOnly);

router.route('/')
    .get(getTaskCardSets)
    .post(createTaskCardSet);

router.route('/:id')
    .get(getTaskCardSetById)
    .put(updateTaskCardSet)
    .delete(deleteTaskCardSet);

export default router;
