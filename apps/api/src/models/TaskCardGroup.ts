import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGroupSetItem {
    setId: Types.ObjectId;
    order: number;
}

export interface ITaskCardGroup extends Document {
    title: string;
    description?: string;
    sets: IGroupSetItem[];
    isPublished: boolean;
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const GroupSetItemSchema = new Schema<IGroupSetItem>(
    {
        setId: {
            type: Schema.Types.ObjectId,
            ref: 'TaskCardSet',
            required: true,
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

const TaskCardGroupSchema = new Schema<ITaskCardGroup>(
    {
        title: {
            type: String,
            required: [true, 'Group title is required'],
            trim: true,
        },
        description: { type: String, trim: true },
        sets: {
            type: [GroupSetItemSchema],
            default: [],
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

TaskCardGroupSchema.index({ isPublished: 1, createdAt: -1 });

export const TaskCardGroup = mongoose.model<ITaskCardGroup>('TaskCardGroup', TaskCardGroupSchema);
export default TaskCardGroup;
