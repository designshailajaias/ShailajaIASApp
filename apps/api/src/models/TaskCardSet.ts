import mongoose, { Schema, Document, Types } from 'mongoose';

export type CardType = 'video' | 'pts_test' | 'mts_test' | 'custom';
export type VideoProviderType = 'youtube' | 'bunny' | 'custom';

export interface IPdfFile {
    title: string;
    pdfUrl: string;
    pdfKey?: string;
}

export interface IFaqItem {
    question: string;
    answer: string;
}

export interface ITaskCard {
    _id?: Types.ObjectId;
    cardType: CardType;
    order: number;
    dayNumber: number;
    title: string;
    description?: string;

    // Cross-course linkage (origin of the video/content)
    sourceCourseId?: Types.ObjectId;
    sourceCourseTitle?: string;
    sourceTopicTitle?: string;
    sourceVideoId?: string;

    // Video & Practice properties
    videoProvider?: VideoProviderType;
    videoUrl?: string;
    notesText?: string;
    pdfFiles?: IPdfFile[];
    prelimsQuizId?: Types.ObjectId;
    prelimsDiscussionVideoUrl?: string;
    prelimsDiscussionVideoProvider?: VideoProviderType;
    mainsPracticeTestId?: Types.ObjectId;
    mainsQuestionText?: string;
    mainsModelAnswer?: string;
    mainsDiscussionVideoUrl?: string;
    mainsDiscussionVideoProvider?: VideoProviderType;
    helpContactInfo?: string;
    faqs?: IFaqItem[];
    isPracticeLocked?: boolean;
    isHelpLocked?: boolean;

    // PTS test card properties
    ptsSeriesId?: Types.ObjectId;
    ptsTestIndex?: number;
    ptsTestTitle?: string;
    ptsQuizId?: Types.ObjectId;
    ptsQuestionPaperUrl?: string;
    ptsSolutionPaperUrl?: string;
    ptsDiscussionVideoUrl?: string;
    ptsSyllabus?: string;

    // MTS test card properties
    mtsSeriesId?: Types.ObjectId;
    mtsTestIndex?: number;
    mtsTestTitle?: string;
    mtsSubjectCategory?: string;
    mtsQuestionPaperUrl?: string;
    mtsSolutionPaperUrl?: string;
    mtsDiscussionVideoUrl?: string;
    mtsSyllabus?: string;
}

export interface ITaskCardSet extends Document {
    title: string;
    description?: string;
    track: 'GS' | 'Optional' | 'Essay' | 'CA' | 'CSAT' | 'Tests';
    cards: ITaskCard[];
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PdfFileSchema = new Schema<IPdfFile>(
    {
        title: { type: String, default: 'Reference Material' },
        pdfUrl: { type: String, default: '' },
        pdfKey: String,
    },
    { _id: false }
);

const FaqItemSchema = new Schema<IFaqItem>(
    {
        question: { type: String, default: '' },
        answer: { type: String, default: '' },
    },
    { _id: false }
);

const TaskCardSchema = new Schema<ITaskCard>(
    {
        cardType: {
            type: String,
            enum: ['video', 'pts_test', 'mts_test', 'custom'],
            default: 'video',
        },
        order: { type: Number, default: 0 },
        dayNumber: { type: Number, default: 1 },
        title: { type: String, default: 'Untitled Card', trim: true },
        description: String,

        // Cross-Course linkage
        sourceCourseId: { type: Schema.Types.ObjectId, ref: 'CourseNode' },
        sourceCourseTitle: String,
        sourceTopicTitle: String,
        sourceVideoId: String,

        // Video Card fields
        videoProvider: {
            type: String,
            enum: ['youtube', 'bunny', 'custom'],
            default: 'youtube',
        },
        videoUrl: { type: String, default: '', trim: true },
        notesText: String,
        pdfFiles: { type: [PdfFileSchema], default: [] },
        prelimsQuizId: { type: Schema.Types.ObjectId, ref: 'Quiz', default: null },
        prelimsDiscussionVideoUrl: String,
        prelimsDiscussionVideoProvider: {
            type: String,
            enum: ['youtube', 'bunny', 'custom'],
            default: 'youtube',
        },
        mainsPracticeTestId: { type: Schema.Types.ObjectId, ref: 'MainsPracticeTest', default: null },
        mainsQuestionText: String,
        mainsModelAnswer: String,
        mainsDiscussionVideoUrl: String,
        mainsDiscussionVideoProvider: {
            type: String,
            enum: ['youtube', 'bunny', 'custom'],
            default: 'youtube',
        },
        helpContactInfo: String,
        faqs: { type: [FaqItemSchema], default: [] },
        isPracticeLocked: { type: Boolean, default: false },
        isHelpLocked: { type: Boolean, default: false },

        // PTS Test Card fields
        ptsSeriesId: { type: Schema.Types.ObjectId, ref: 'TestSeries' },
        ptsTestIndex: Number,
        ptsTestTitle: String,
        ptsQuizId: { type: Schema.Types.ObjectId, ref: 'Quiz' },
        ptsQuestionPaperUrl: String,
        ptsSolutionPaperUrl: String,
        ptsDiscussionVideoUrl: String,
        ptsSyllabus: String,

        // MTS Test Card fields
        mtsSeriesId: { type: Schema.Types.ObjectId, ref: 'MainsTestSeries' },
        mtsTestIndex: Number,
        mtsTestTitle: String,
        mtsSubjectCategory: String,
        mtsQuestionPaperUrl: String,
        mtsSolutionPaperUrl: String,
        mtsDiscussionVideoUrl: String,
        mtsSyllabus: String,
    },
    { _id: true }
);

const TaskCardSetSchema = new Schema<ITaskCardSet>(
    {
        title: {
            type: String,
            required: [true, 'Set title is required'],
            trim: true,
        },
        description: { type: String, trim: true },
        track: {
            type: String,
            enum: ['GS', 'Optional', 'Essay', 'CA', 'CSAT', 'Tests'],
            default: 'GS',
        },
        cards: { type: [TaskCardSchema], default: [] },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

TaskCardSetSchema.index({ track: 1, createdAt: -1 });

export const TaskCardSet = mongoose.model<ITaskCardSet>('TaskCardSet', TaskCardSetSchema);
export default TaskCardSet;
