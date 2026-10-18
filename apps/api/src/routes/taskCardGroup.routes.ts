import { Router } from 'express';
import {
    getTaskCardGroups,
    getTaskCardGroupById,
    createTaskCardGroup,
    updateTaskCardGroup,
    deleteTaskCardGroup,
} from '../controllers/taskCardGroup.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.use(protect, adminOnly);

router.route('/')
    .get(getTaskCardGroups)
    .post(createTaskCardGroup);

router.route('/:id')
    .get(getTaskCardGroupById)
    .put(updateTaskCardGroup)
    .delete(deleteTaskCardGroup);

export default router;
