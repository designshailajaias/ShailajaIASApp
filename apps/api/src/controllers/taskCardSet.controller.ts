import type { Request, Response } from 'express';
import { TaskCardSet, TaskCardGroup } from '../models/index.js';

// @desc    Get all task card sets (with optional track filter)
// @route   GET /api/task-card-sets
// @access  Private/Admin
export const getTaskCardSets = async (req: Request, res: Response): Promise<void> => {
    try {
        const { track } = req.query;
        const query: any = {};
        if (track && typeof track === 'string' && track !== 'all') {
            query.track = track;
        }

        const sets = await TaskCardSet.find(query).sort({ createdAt: -1 }).lean();

        const formattedSets = sets.map((s: any) => ({
            _id: s._id,
            title: s.title,
            description: s.description || '',
            track: s.track,
            totalCards: Array.isArray(s.cards) ? s.cards.length : 0,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
        }));

        res.json({
            success: true,
            data: formattedSets,
        });
    } catch (error) {
        console.error('getTaskCardSets error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get a single task card set by ID with all cards
// @route   GET /api/task-card-sets/:id
// @access  Private/Admin
export const getTaskCardSetById = async (req: Request, res: Response): Promise<void> => {
    try {
        const set = await TaskCardSet.findById(req.params.id);
        if (!set) {
            res.status(404).json({ success: false, message: 'Task card set not found' });
            return;
        }

        // Return sorted cards
        const sortedCards = (set.cards || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

        res.json({
            success: true,
            data: {
                _id: set._id,
                title: set.title,
                description: set.description || '',
                track: set.track,
                cards: sortedCards,
                createdAt: set.createdAt,
                updatedAt: set.updatedAt,
            },
        });
    } catch (error) {
        console.error('getTaskCardSetById error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create a new task card set
// @route   POST /api/task-card-sets
// @access  Private/Admin
export const createTaskCardSet = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, track, cards } = req.body;

        if (!title || typeof title !== 'string' || !title.trim()) {
            res.status(400).json({ success: false, message: 'Set title is required' });
            return;
        }

        const normalizedCards = Array.isArray(cards)
            ? cards.map((c: any, idx: number) => ({
                  ...c,
                  order: idx,
                  dayNumber: idx + 1,
                  title: (c.title || `Day ${idx + 1} Task`).trim(),
              }))
            : [];

        const newSet = await TaskCardSet.create({
            title: title.trim(),
            description: (description || '').trim(),
            track: track || 'GS',
            cards: normalizedCards,
            createdBy: (req as any).user?._id,
        });

        res.status(201).json({
            success: true,
            data: newSet,
        });
    } catch (error) {
        console.error('createTaskCardSet error:', error);
        res.status(500).json({ success: false, message: (error as Error).message || 'Server error' });
    }
};

// @desc    Update a task card set (metadata or cards sequence)
// @route   PUT /api/task-card-sets/:id
// @access  Private/Admin
export const updateTaskCardSet = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, track, cards } = req.body;
        const set = await TaskCardSet.findById(req.params.id);

        if (!set) {
            res.status(404).json({ success: false, message: 'Task card set not found' });
            return;
        }

        if (title !== undefined) set.title = title.trim();
        if (description !== undefined) set.description = description.trim();
        if (track !== undefined) set.track = track;

        if (Array.isArray(cards)) {
            set.cards = cards.map((c: any, idx: number) => ({
                ...c,
                order: idx,
                dayNumber: idx + 1,
                title: (c.title || `Day ${idx + 1} Task`).trim(),
            })) as any;
        }

        await set.save();

        res.json({
            success: true,
            data: set,
        });
    } catch (error) {
        console.error('updateTaskCardSet error:', error);
        res.status(500).json({ success: false, message: (error as Error).message || 'Server error' });
    }
};

// @desc    Delete a task card set
// @route   DELETE /api/task-card-sets/:id
// @access  Private/Admin
export const deleteTaskCardSet = async (req: Request, res: Response): Promise<void> => {
    try {
        const setId = req.params.id;

        // Verify if any TaskCardGroup is referencing this set
        const linkedGroup = await TaskCardGroup.findOne({ 'sets.setId': setId }).lean();
        if (linkedGroup) {
            res.status(400).json({
                success: false,
                message: `Cannot delete this set because it is used in the Task Card Group "${linkedGroup.title}". Remove it from the group first.`,
            });
            return;
        }

        const deleted = await TaskCardSet.findByIdAndDelete(setId);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Task card set not found' });
            return;
        }

        res.json({
            success: true,
            message: 'Task card set deleted successfully',
        });
    } catch (error) {
        console.error('deleteTaskCardSet error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
