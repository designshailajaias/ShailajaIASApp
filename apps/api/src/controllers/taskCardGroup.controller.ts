import type { Request, Response } from 'express';
import { TaskCardGroup, MentorshipCourse, TaskCardSet } from '../models/index.js';

// @desc    Get all task card groups with summarized set counts and linked mentorship courses
// @route   GET /api/task-card-groups
// @access  Private/Admin
export const getTaskCardGroups = async (_req: Request, res: Response): Promise<void> => {
    try {
        const groups = await TaskCardGroup.find({})
            .populate({
                path: 'sets.setId',
                select: 'title track cards',
            })
            .sort({ createdAt: -1 })
            .lean();

        // Also fetch all mentorship courses that link to any group
        const mentorshipCourses = await MentorshipCourse.find({
            taskCardGroupId: { $in: groups.map((g) => g._id) },
        })
            .select('title taskCardGroupId price isPublished')
            .lean();

        const formattedGroups = groups.map((g: any) => {
            const linkedCourses = mentorshipCourses.filter(
                (mc: any) => mc.taskCardGroupId && mc.taskCardGroupId.toString() === g._id.toString()
            );

            let totalCardsInGroup = 0;
            const validSets = (g.sets || [])
                .filter((item: any) => item.setId)
                .map((item: any) => {
                    const setDoc = item.setId;
                    const cardCount = Array.isArray(setDoc.cards) ? setDoc.cards.length : 0;
                    totalCardsInGroup += cardCount;
                    return {
                        _id: setDoc._id,
                        title: setDoc.title,
                        track: setDoc.track,
                        cardCount,
                        order: item.order,
                    };
                })
                .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

            return {
                _id: g._id,
                title: g.title,
                description: g.description || '',
                totalSets: validSets.length,
                totalCards: totalCardsInGroup,
                sets: validSets,
                isPublished: g.isPublished !== false,
                linkedMentorshipCourses: linkedCourses.map((mc: any) => ({
                    _id: mc._id,
                    title: mc.title,
                    price: mc.price,
                })),
                createdAt: g.createdAt,
                updatedAt: g.updatedAt,
            };
        });

        res.json({
            success: true,
            data: formattedGroups,
        });
    } catch (error) {
        console.error('getTaskCardGroups error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get a single task card group by ID with full sets and card details
// @route   GET /api/task-card-groups/:id
// @access  Private/Admin
export const getTaskCardGroupById = async (req: Request, res: Response): Promise<void> => {
    try {
        const group = await TaskCardGroup.findById(req.params.id)
            .populate({
                path: 'sets.setId',
                model: 'TaskCardSet',
            })
            .lean();

        if (!group) {
            res.status(404).json({ success: false, message: 'Task card group not found' });
            return;
        }

        const sortedSets = (group.sets || [])
            .slice()
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((item: any) => ({
                order: item.order,
                set: item.setId,
            }));

        res.json({
            success: true,
            data: {
                _id: group._id,
                title: group.title,
                description: group.description || '',
                isPublished: group.isPublished,
                sets: sortedSets,
                createdAt: group.createdAt,
                updatedAt: group.updatedAt,
            },
        });
    } catch (error) {
        console.error('getTaskCardGroupById error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create a new task card group
// @route   POST /api/task-card-groups
// @access  Private/Admin
export const createTaskCardGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, sets, isPublished } = req.body;

        if (!title || typeof title !== 'string' || !title.trim()) {
            res.status(400).json({ success: false, message: 'Group title is required' });
            return;
        }

        // Validate sets array
        const normalizedSets: any[] = [];
        if (Array.isArray(sets)) {
            for (let idx = 0; idx < sets.length; idx++) {
                const s = sets[idx];
                const setId = typeof s === 'string' ? s : s.setId || s._id;
                if (setId) {
                    // Check if setId exists
                    const exists = await TaskCardSet.exists({ _id: setId });
                    if (exists) {
                        normalizedSets.push({
                            setId,
                            order: typeof s.order === 'number' ? s.order : idx,
                        });
                    }
                }
            }
        }

        normalizedSets.sort((a, b) => a.order - b.order);
        normalizedSets.forEach((s, idx) => (s.order = idx));

        const newGroup = await TaskCardGroup.create({
            title: title.trim(),
            description: (description || '').trim(),
            sets: normalizedSets,
            isPublished: isPublished !== false,
            createdBy: (req as any).user?._id,
        });

        res.status(201).json({
            success: true,
            data: newGroup,
        });
    } catch (error) {
        console.error('createTaskCardGroup error:', error);
        res.status(500).json({ success: false, message: (error as Error).message || 'Server error' });
    }
};

// @desc    Update a task card group
// @route   PUT /api/task-card-groups/:id
// @access  Private/Admin
export const updateTaskCardGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, sets, isPublished } = req.body;
        const group = await TaskCardGroup.findById(req.params.id);

        if (!group) {
            res.status(404).json({ success: false, message: 'Task card group not found' });
            return;
        }

        if (title !== undefined) group.title = title.trim();
        if (description !== undefined) group.description = description.trim();
        if (isPublished !== undefined) group.isPublished = Boolean(isPublished);

        if (Array.isArray(sets)) {
            const normalizedSets: any[] = [];
            for (let idx = 0; idx < sets.length; idx++) {
                const s = sets[idx];
                const setId = typeof s === 'string' ? s : s.setId || s._id;
                if (setId) {
                    normalizedSets.push({
                        setId,
                        order: typeof s.order === 'number' ? s.order : idx,
                    });
                }
            }
            normalizedSets.sort((a, b) => a.order - b.order);
            normalizedSets.forEach((s, idx) => (s.order = idx));
            group.sets = normalizedSets as any;
        }

        await group.save();

        res.json({
            success: true,
            data: group,
        });
    } catch (error) {
        console.error('updateTaskCardGroup error:', error);
        res.status(500).json({ success: false, message: (error as Error).message || 'Server error' });
    }
};

// @desc    Delete a task card group
// @route   DELETE /api/task-card-groups/:id
// @access  Private/Admin
export const deleteTaskCardGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const groupId = req.params.id;

        // Verify if any MentorshipCourse is linked to this group
        const linkedCourse = await MentorshipCourse.findOne({ taskCardGroupId: groupId }).lean();
        if (linkedCourse) {
            res.status(400).json({
                success: false,
                message: `Cannot delete this group because it is currently linked to Mentorship Course "${linkedCourse.title}". Reassign the course first.`,
            });
            return;
        }

        const deleted = await TaskCardGroup.findByIdAndDelete(groupId);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Task card group not found' });
            return;
        }

        res.json({
            success: true,
            message: 'Task card group deleted successfully',
        });
    } catch (error) {
        console.error('deleteTaskCardGroup error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
