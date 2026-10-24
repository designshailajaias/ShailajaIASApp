'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { API_URL } from '@/lib/api';

type VideoProviderType = 'youtube' | 'bunny' | 'custom';
type CardType = 'video' | 'pts_test' | 'mts_test' | 'custom';
type TrackType = 'GS' | 'Optional' | 'Essay' | 'CA' | 'CSAT' | 'Tests';

interface PdfFile {
    title: string;
    pdfUrl: string;
    pdfKey?: string;
}

interface FaqItem {
    question: string;
    answer: string;
}

interface TaskCard {
    _id?: string;
    cardType: CardType;
    order: number;
    title: string;
    description?: string;
    dayNumber?: number;

    // Cross-course linkage
    sourceCourseId?: string;
    sourceCourseTitle?: string;
    sourceTopicTitle?: string;
    sourceVideoId?: string;

    // Video Card fields
    videoProvider?: VideoProviderType;
    videoUrl?: string;
    notesText?: string;
    pdfFiles?: PdfFile[];
    prelimsQuizId?: string | null;
    prelimsDiscussionVideoUrl?: string;
    prelimsDiscussionVideoProvider?: VideoProviderType;
    mainsPracticeTestId?: string | null;
    mainsQuestionText?: string;
    mainsModelAnswer?: string;
    mainsDiscussionVideoUrl?: string;
    mainsDiscussionVideoProvider?: VideoProviderType;
    helpContactInfo?: string;
    faqs?: FaqItem[];

    // PTS Test Card fields
    ptsSeriesId?: string | null;
    ptsTestIndex?: number;
    ptsTestTitle?: string;
    ptsQuizId?: string | null;
    ptsQuestionPaperUrl?: string;
    ptsSolutionPaperUrl?: string;
    ptsDiscussionVideoUrl?: string;
    ptsSyllabus?: string;

    // MTS Test Card fields
    mtsSeriesId?: string | null;
    mtsTestIndex?: number;
    mtsTestTitle?: string;
    mtsSubjectCategory?: string;
    mtsQuestionPaperUrl?: string;
    mtsSolutionPaperUrl?: string;
    mtsDiscussionVideoUrl?: string;
    mtsSyllabus?: string;
}

interface TaskCardSetSummary {
    _id: string;
    title: string;
    description: string;
    track: TrackType;
    totalCards: number;
    createdAt?: string;
}

interface TaskCardGroupSummary {
    _id: string;
    title: string;
    description: string;
    totalSets: number;
    totalCards: number;
    isPublished: boolean;
    sets: {
        _id: string;
        title: string;
        track: string;
        cardCount: number;
        order: number;
    }[];
    linkedMentorshipCourses: {
        _id: string;
        title: string;
        price: string;
    }[];
}

interface CatalogVideoItem {
    _id: string;
    courseId: string;
    courseTitle: string;
    topicId: string;
    topicTitle: string;
    videoIndex: number;
    title: string;
    description?: string;
    videoProvider: VideoProviderType;
    videoUrl: string;
    notesText?: string;
    pdfFiles?: PdfFile[];
    prelimsQuizId?: string | null;
    prelimsDiscussionVideoUrl?: string;
    prelimsDiscussionVideoProvider?: VideoProviderType;
    mainsPracticeTestId?: string | null;
    mainsQuestionText?: string;
    mainsModelAnswer?: string;
    mainsDiscussionVideoUrl?: string;
    mainsDiscussionVideoProvider?: VideoProviderType;
    helpContactInfo?: string;
    faqs?: FaqItem[];
}

interface PtsSeriesOption {
    _id: string;
    uniqueId?: string;
    title: string;
    tests: {
        index: number;
        title: string;
        date: string;
        quizId?: string;
        syllabus?: string;
        questionPaperUrl?: string;
        solutionPaperUrl?: string;
        discussionVideoUrl?: string;
        subjectTags?: string[];
    }[];
}

interface MtsSeriesOption {
    _id: string;
    uniqueId?: string;
    title: string;
    tests: {
        index: number;
        title: string;
        date: string;
        subjectCategory?: string;
        syllabus?: string;
        questionPaperUrl?: string;
        solutionPaperUrl?: string;
        discussionVideoUrl?: string;
    }[];
}

interface QuizOption {
    _id: string;
    title: string;
    date?: string;
}

function TaskCardsManagerContent() {
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get('tab') as 'sets' | 'groups') || 'sets';
    const initialSetId = searchParams.get('setId') || '';
    const initialGroupId = searchParams.get('groupId') || '';
    const { token } = useAuth();

    const [activeTab, setActiveTab] = useState<'sets' | 'groups'>(initialTab);

    // ==========================================
    // TAB 1: TASK CARD SETS STATE
    // ==========================================
    const [setsList, setSetsList] = useState<TaskCardSetSummary[]>([]);
    const [selectedSetId, setSelectedSetId] = useState<string>(initialSetId);
    const [setTitle, setSetTitle] = useState('');
    const [setDescription, setSetDescription] = useState('');
    const [setTrack, setSetTrack] = useState<TrackType>('GS');
    const [setCards, setSetCards] = useState<TaskCard[]>([]);

    const [isLoadingSets, setIsLoadingSets] = useState(false);
    const [isLoadingSetDetails, setIsLoadingSetDetails] = useState(false);
    const [isSavingSet, setIsSavingSet] = useState(false);
    const [setStatusMsg, setSetStatusMsg] = useState('');
    const [setErrorMsg, setSetErrorMsg] = useState('');

    // ==========================================
    // TAB 2: TASK CARD GROUPS STATE
    // ==========================================
    const [groupsList, setGroupsList] = useState<TaskCardGroupSummary[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId);
    const [groupTitle, setGroupTitle] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [groupIsPublished, setGroupIsPublished] = useState(true);
    const [groupSets, setGroupSets] = useState<
        {
            setId: string;
            title: string;
            track: string;
            cardCount: number;
            order: number;
        }[]
    >([]);
    const [addSetPickerId, setAddSetPickerId] = useState('');

    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
    const [isLoadingGroupDetails, setIsLoadingGroupDetails] = useState(false);
    const [isSavingGroup, setIsSavingGroup] = useState(false);
    const [groupStatusMsg, setGroupStatusMsg] = useState('');
    const [groupErrorMsg, setGroupErrorMsg] = useState('');

    // ==========================================
    // CROSS-COURSE VIDEO CATALOG & TEST CATALOGS
    // ==========================================
    const [videoCatalog, setVideoCatalog] = useState<CatalogVideoItem[]>([]);
    const [videoCatalogCourses, setVideoCatalogCourses] = useState<{ _id: string; title: string }[]>([]);
    const [ptsCatalog, setPtsCatalog] = useState<PtsSeriesOption[]>([]);
    const [mtsCatalog, setMtsCatalog] = useState<MtsSeriesOption[]>([]);
    const [quizzesList, setQuizzesList] = useState<QuizOption[]>([]);

    // ==========================================
    // MODALS STATE
    // ==========================================
    // 1. Cross-course Video Picker
    const [showVideoPickerModal, setShowVideoPickerModal] = useState(false);
    const [videoSearchQuery, setVideoSearchQuery] = useState('');
    const [videoCourseFilter, setVideoCourseFilter] = useState('');

    // 2. Video Card Editor
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
    const [videoForm, setVideoForm] = useState<Partial<TaskCard>>({});

    // 3. PTS Test Picker Modal
    const [showPtsModal, setShowPtsModal] = useState(false);
    const [ptsSelectedSeriesId, setPtsSelectedSeriesId] = useState('');
    const [ptsSelectedTestIdx, setPtsSelectedTestIdx] = useState(0);

    // 4. MTS Test Picker Modal
    const [showMtsModal, setShowMtsModal] = useState(false);
    const [mtsSelectedSeriesId, setMtsSelectedSeriesId] = useState('');
    const [mtsSelectedTestIdx, setMtsSelectedTestIdx] = useState(0);

    // 5. Excel Import inside Video Modal
    const [showPrelimsExcelModal, setShowPrelimsExcelModal] = useState(false);
    const [prelimsQuizTitle, setPrelimsQuizTitle] = useState('');
    const [prelimsQuizDate, setPrelimsQuizDate] = useState('');
    const [prelimsExcelFile, setPrelimsExcelFile] = useState<File | null>(null);
    const [prelimsImporting, setPrelimsImporting] = useState(false);
    const [prelimsImportError, setPrelimsImportError] = useState('');

    // Fetch initial data
    useEffect(() => {
        if (token) {
            fetchSetsList();
            fetchGroupsList();
            fetchVideosCatalog();
            fetchTestsCatalog();
            fetchQuizzes();
        }
    }, [token]);

    // Handle Set Selection
    useEffect(() => {
        if (selectedSetId && selectedSetId !== 'new' && token) {
            fetchSetDetails(selectedSetId);
        } else if (selectedSetId === 'new') {
            setSetTitle('');
            setSetDescription('');
            setSetTrack('GS');
            setSetCards([]);
        }
    }, [selectedSetId, token]);

    // Handle Group Selection
    useEffect(() => {
        if (selectedGroupId && selectedGroupId !== 'new' && token) {
            fetchGroupDetails(selectedGroupId);
        } else if (selectedGroupId === 'new') {
            setGroupTitle('');
            setGroupDescription('');
            setGroupIsPublished(true);
            setGroupSets([]);
        }
    }, [selectedGroupId, token]);

    // ==========================================
    // API CALLS: SETS
    // ==========================================
    const fetchSetsList = async () => {
        setIsLoadingSets(true);
        try {
            const res = await fetch(`${API_URL}/api/task-card-sets`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setSetsList(data.data);
                if (!selectedSetId && data.data.length > 0) {
                    setSelectedSetId(data.data[0]._id);
                }
            }
        } catch (err) {
            console.error('Fetch sets error:', err);
        } finally {
            setIsLoadingSets(false);
        }
    };

    const fetchSetDetails = async (setId: string) => {
        setIsLoadingSetDetails(true);
        setSetStatusMsg('');
        setSetErrorMsg('');
        try {
            const res = await fetch(`${API_URL}/api/task-card-sets/${setId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data) {
                setSetTitle(data.data.title || '');
                setSetDescription(data.data.description || '');
                setSetTrack(data.data.track || 'GS');
                setSetCards(data.data.cards || []);
            }
        } catch (err) {
            console.error('Fetch set details error:', err);
            setSetErrorMsg('Failed to load task card set');
        } finally {
            setIsLoadingSetDetails(false);
        }
    };

    const handleSaveSet = async () => {
        if (!setTitle.trim()) {
            setSetErrorMsg('Please provide a Set Title');
            return;
        }

        setIsSavingSet(true);
        setSetStatusMsg('');
        setSetErrorMsg('');

        try {
            const payload = {
                title: setTitle.trim(),
                description: setDescription.trim(),
                track: setTrack,
                cards: setCards,
            };

            const isNew = selectedSetId === 'new' || !selectedSetId;
            const url = isNew ? `${API_URL}/api/task-card-sets` : `${API_URL}/api/task-card-sets/${selectedSetId}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.success) {
                setSetStatusMsg('✓ Task Card Set saved successfully!');
                await fetchSetsList();
                if (isNew && data.data?._id) {
                    setSelectedSetId(data.data._id);
                }
            } else {
                setSetErrorMsg(data.message || 'Failed to save set');
            }
        } catch (err) {
            console.error('Save set error:', err);
            setSetErrorMsg('Network error while saving set');
        } finally {
            setIsSavingSet(false);
        }
    };

    const handleDeleteSet = async () => {
        if (!selectedSetId || selectedSetId === 'new') return;
        if (!confirm(`Are you sure you want to delete the set "${setTitle}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`${API_URL}/api/task-card-sets/${selectedSetId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                alert('Task Card Set deleted successfully');
                await fetchSetsList();
                setSelectedSetId('new');
            } else {
                alert(data.message || 'Failed to delete set');
            }
        } catch (err) {
            console.error('Delete set error:', err);
            alert('Failed to delete set');
        }
    };

    // ==========================================
    // API CALLS: GROUPS
    // ==========================================
    const fetchGroupsList = async () => {
        setIsLoadingGroups(true);
        try {
            const res = await fetch(`${API_URL}/api/task-card-groups`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setGroupsList(data.data);
                if (!selectedGroupId && data.data.length > 0) {
                    setSelectedGroupId(data.data[0]._id);
                }
            }
        } catch (err) {
            console.error('Fetch groups error:', err);
        } finally {
            setIsLoadingGroups(false);
        }
    };

    const fetchGroupDetails = async (groupId: string) => {
        setIsLoadingGroupDetails(true);
        setGroupStatusMsg('');
        setGroupErrorMsg('');
        try {
            const res = await fetch(`${API_URL}/api/task-card-groups/${groupId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data) {
                setGroupTitle(data.data.title || '');
                setGroupDescription(data.data.description || '');
                setGroupIsPublished(data.data.isPublished !== false);
                const loadedSets = (data.data.sets || []).map((item: any, idx: number) => ({
                    setId: item.set?._id || item.setId,
                    title: item.set?.title || 'Unknown Set',
                    track: item.set?.track || 'GS',
                    cardCount: Array.isArray(item.set?.cards) ? item.set.cards.length : 0,
                    order: idx,
                }));
                setGroupSets(loadedSets);
            }
        } catch (err) {
            console.error('Fetch group details error:', err);
            setGroupErrorMsg('Failed to load group details');
        } finally {
            setIsLoadingGroupDetails(false);
        }
    };

    const handleSaveGroup = async () => {
        if (!groupTitle.trim()) {
            setGroupErrorMsg('Please provide a Group Title');
            return;
        }

        setIsSavingGroup(true);
        setGroupStatusMsg('');
        setGroupErrorMsg('');

        try {
            const payload = {
                title: groupTitle.trim(),
                description: groupDescription.trim(),
                isPublished: groupIsPublished,
                sets: groupSets.map((s, idx) => ({
                    setId: s.setId,
                    order: idx,
                })),
            };

            const isNew = selectedGroupId === 'new' || !selectedGroupId;
            const url = isNew ? `${API_URL}/api/task-card-groups` : `${API_URL}/api/task-card-groups/${selectedGroupId}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.success) {
                setGroupStatusMsg('✓ Task Card Group saved successfully!');
                await fetchGroupsList();
                if (isNew && data.data?._id) {
                    setSelectedGroupId(data.data._id);
                }
            } else {
                setGroupErrorMsg(data.message || 'Failed to save group');
            }
        } catch (err) {
            console.error('Save group error:', err);
            setGroupErrorMsg('Network error while saving group');
        } finally {
            setIsSavingGroup(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!selectedGroupId || selectedGroupId === 'new') return;
        if (!confirm(`Are you sure you want to delete the group "${groupTitle}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`${API_URL}/api/task-card-groups/${selectedGroupId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                alert('Task Card Group deleted successfully');
                await fetchGroupsList();
                setSelectedGroupId('new');
            } else {
                alert(data.message || 'Failed to delete group');
            }
        } catch (err) {
            console.error('Delete group error:', err);
            alert('Failed to delete group');
        }
    };

    // ==========================================
    // API CALLS: CATALOGS
    // ==========================================
    const fetchVideosCatalog = async () => {
        try {
            const res = await fetch(`${API_URL}/api/courses/videos-catalog`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data) {
                setVideoCatalog(data.data.videos || []);
                setVideoCatalogCourses(data.data.courses || []);
            }
        } catch (err) {
            console.error('Fetch videos catalog error:', err);
        }
    };

    const fetchTestsCatalog = async () => {
        try {
            const res = await fetch(`${API_URL}/api/courses/tests-catalog`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data) {
                setPtsCatalog(data.data.pts || []);
                setMtsCatalog(data.data.mts || []);
            }
        } catch (err) {
            console.error('Fetch tests catalog error:', err);
        }
    };

    const fetchQuizzes = async () => {
        try {
            const res = await fetch(`${API_URL}/api/quizzes`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setQuizzesList(data.data);
            }
        } catch (err) {
            console.error('Fetch quizzes error:', err);
        }
    };

    // ==========================================
    // CARD MANIPULATION (TAB 1: SETS)
    // ==========================================
    const moveCard = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= setCards.length) return;

        const updated = [...setCards];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;

        const reordered = updated.map((c, i) => ({
            ...c,
            order: i,
            dayNumber: i + 1,
        }));
        setSetCards(reordered);
    };

    const deleteCard = (index: number) => {
        if (!confirm(`Are you sure you want to remove card #${index + 1}?`)) return;
        const filtered = setCards.filter((_, i) => i !== index);
        const reordered = filtered.map((c, i) => ({
            ...c,
            order: i,
            dayNumber: i + 1,
        }));
        setSetCards(reordered);
    };

    const openEditCard = (card: TaskCard, index: number) => {
        setEditingCardIndex(index);
        if (card.cardType === 'video' || card.cardType === 'custom') {
            setVideoForm({ ...card });
            setShowVideoModal(true);
        } else if (card.cardType === 'pts_test') {
            setPtsSelectedSeriesId(card.ptsSeriesId || '');
            setPtsSelectedTestIdx(card.ptsTestIndex || 0);
            setShowPtsModal(true);
        } else if (card.cardType === 'mts_test') {
            setMtsSelectedSeriesId(card.mtsSeriesId || '');
            setMtsSelectedTestIdx(card.mtsTestIndex || 0);
            setShowMtsModal(true);
        }
    };

    // Video Selection from Cross-Course Catalog
    const handlePickVideoFromCatalog = (v: CatalogVideoItem) => {
        const newCard: Partial<TaskCard> = {
            cardType: 'video',
            title: v.title || `Day ${setCards.length + 1} Video`,
            description: v.description || '',
            sourceCourseId: v.courseId,
            sourceCourseTitle: v.courseTitle,
            sourceTopicTitle: v.topicTitle,
            sourceVideoId: v._id,
            videoProvider: v.videoProvider || 'youtube',
            videoUrl: v.videoUrl || '',
            notesText: v.notesText || '',
            pdfFiles: v.pdfFiles || [],
            prelimsQuizId: v.prelimsQuizId || null,
            prelimsDiscussionVideoUrl: v.prelimsDiscussionVideoUrl || '',
            prelimsDiscussionVideoProvider: v.prelimsDiscussionVideoProvider || 'youtube',
            mainsPracticeTestId: v.mainsPracticeTestId || null,
            mainsQuestionText: v.mainsQuestionText || '',
            mainsModelAnswer: v.mainsModelAnswer || '',
            mainsDiscussionVideoUrl: v.mainsDiscussionVideoUrl || '',
            mainsDiscussionVideoProvider: v.mainsDiscussionVideoProvider || 'youtube',
            helpContactInfo: v.helpContactInfo || '',
            faqs: v.faqs || [],
        };

        setVideoForm(newCard);
        setShowVideoPickerModal(false);
        setEditingCardIndex(null); // Creating new card
        setShowVideoModal(true);
    };

    const handleSaveVideoCard = () => {
        if (!videoForm.title?.trim()) {
            alert('Please enter a card title');
            return;
        }

        const cardData: TaskCard = {
            cardType: 'video',
            order: editingCardIndex !== null ? editingCardIndex : setCards.length,
            dayNumber: (editingCardIndex !== null ? editingCardIndex : setCards.length) + 1,
            title: videoForm.title.trim(),
            description: videoForm.description || '',
            sourceCourseId: videoForm.sourceCourseId,
            sourceCourseTitle: videoForm.sourceCourseTitle,
            sourceTopicTitle: videoForm.sourceTopicTitle,
            sourceVideoId: videoForm.sourceVideoId,
            videoProvider: videoForm.videoProvider || 'youtube',
            videoUrl: videoForm.videoUrl || '',
            notesText: videoForm.notesText || '',
            pdfFiles: videoForm.pdfFiles || [],
            prelimsQuizId: videoForm.prelimsQuizId || null,
            prelimsDiscussionVideoUrl: videoForm.prelimsDiscussionVideoUrl || '',
            prelimsDiscussionVideoProvider: videoForm.prelimsDiscussionVideoProvider || 'youtube',
            mainsPracticeTestId: videoForm.mainsPracticeTestId || null,
            mainsQuestionText: videoForm.mainsQuestionText || '',
            mainsModelAnswer: videoForm.mainsModelAnswer || '',
            mainsDiscussionVideoUrl: videoForm.mainsDiscussionVideoUrl || '',
            mainsDiscussionVideoProvider: videoForm.mainsDiscussionVideoProvider || 'youtube',
            helpContactInfo: videoForm.helpContactInfo || '',
            faqs: videoForm.faqs || [],
        };

        if (editingCardIndex !== null) {
            const updated = [...setCards];
            updated[editingCardIndex] = cardData;
            setSetCards(updated);
        } else {
            setSetCards([...setCards, cardData]);
        }

        setShowVideoModal(false);
        setEditingCardIndex(null);
        setVideoForm({});
    };

    const handleSavePtsCard = () => {
        const series = ptsCatalog.find((s) => s._id === ptsSelectedSeriesId);
        if (!series) {
            alert('Please select a Prelims Test Series');
            return;
        }

        const test = series.tests[ptsSelectedTestIdx];
        if (!test) {
            alert('Please select a valid test');
            return;
        }

        const cardData: TaskCard = {
            cardType: 'pts_test',
            order: editingCardIndex !== null ? editingCardIndex : setCards.length,
            dayNumber: (editingCardIndex !== null ? editingCardIndex : setCards.length) + 1,
            title: `[PTS] ${series.title} — ${test.title || `Test #${ptsSelectedTestIdx + 1}`}`,
            description: test.syllabus ? `Syllabus: ${test.syllabus}` : `Prelims Sectional/Mock Test`,
            ptsSeriesId: series._id,
            ptsTestIndex: ptsSelectedTestIdx,
            ptsTestTitle: test.title || `Test #${ptsSelectedTestIdx + 1}`,
            ptsQuizId: test.quizId || null,
            ptsQuestionPaperUrl: test.questionPaperUrl || '',
            ptsSolutionPaperUrl: test.solutionPaperUrl || '',
            ptsDiscussionVideoUrl: test.discussionVideoUrl || '',
            ptsSyllabus: test.syllabus || '',
        };

        if (editingCardIndex !== null) {
            const updated = [...setCards];
            updated[editingCardIndex] = cardData;
            setSetCards(updated);
        } else {
            setSetCards([...setCards, cardData]);
        }

        setShowPtsModal(false);
        setEditingCardIndex(null);
    };

    const handleSaveMtsCard = () => {
        const series = mtsCatalog.find((s) => s._id === mtsSelectedSeriesId);
        if (!series) {
            alert('Please select a Mains Test Series');
            return;
        }

        const test = series.tests[mtsSelectedTestIdx];
        if (!test) {
            alert('Please select a valid test');
            return;
        }

        const cardData: TaskCard = {
            cardType: 'mts_test',
            order: editingCardIndex !== null ? editingCardIndex : setCards.length,
            dayNumber: (editingCardIndex !== null ? editingCardIndex : setCards.length) + 1,
            title: `[MTS] ${series.title} — ${test.title || `Test #${mtsSelectedTestIdx + 1}`}`,
            description: test.syllabus ? `Syllabus: ${test.syllabus}` : `Mains Test Practice Paper`,
            mtsSeriesId: series._id,
            mtsTestIndex: mtsSelectedTestIdx,
            mtsTestTitle: test.title || `Test #${mtsSelectedTestIdx + 1}`,
            mtsSubjectCategory: test.subjectCategory || '',
            mtsQuestionPaperUrl: test.questionPaperUrl || '',
            mtsSolutionPaperUrl: test.solutionPaperUrl || '',
            mtsDiscussionVideoUrl: test.discussionVideoUrl || '',
            mtsSyllabus: test.syllabus || '',
        };

        if (editingCardIndex !== null) {
            const updated = [...setCards];
            updated[editingCardIndex] = cardData;
            setSetCards(updated);
        } else {
            setSetCards([...setCards, cardData]);
        }

        setShowMtsModal(false);
        setEditingCardIndex(null);
    };

    // ==========================================
    // GROUP MANIPULATION (TAB 2: GROUPS)
    // ==========================================
    const handleAddSetToGroup = () => {
        if (!addSetPickerId) return;
        const setItem = setsList.find((s) => s._id === addSetPickerId);
        if (!setItem) return;

        const newEntry = {
            setId: setItem._id,
            title: setItem.title,
            track: setItem.track,
            cardCount: setItem.totalCards,
            order: groupSets.length,
        };

        setGroupSets([...groupSets, newEntry]);
        setAddSetPickerId('');
    };

    const moveGroupSet = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= groupSets.length) return;

        const updated = [...groupSets];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;

        const reordered = updated.map((s, idx) => ({ ...s, order: idx }));
        setGroupSets(reordered);
    };

    const removeGroupSet = (index: number) => {
        const filtered = groupSets.filter((_, i) => i !== index);
        const reordered = filtered.map((s, idx) => ({ ...s, order: idx }));
        setGroupSets(reordered);
    };

    // Total cards in current group
    const totalGroupStudyDays = groupSets.reduce((acc, curr) => acc + (curr.cardCount || 0), 0);

    // Current group object for checking linked mentorship courses
    const currentGroupObj = groupsList.find((g) => g._id === selectedGroupId);

    // Filtered Video Catalog
    const filteredVideos = videoCatalog.filter((v) => {
        const matchesCourse = !videoCourseFilter || v.courseId === videoCourseFilter;
        const q = videoSearchQuery.toLowerCase();
        const matchesQuery =
            !videoSearchQuery ||
            v.title.toLowerCase().includes(q) ||
            v.courseTitle.toLowerCase().includes(q) ||
            v.topicTitle.toLowerCase().includes(q) ||
            (v.notesText && v.notesText.toLowerCase().includes(q));
        return matchesCourse && matchesQuery;
    });

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6">
            {/* Header & Mode Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🗂️</span>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                            Task Card Sequencer & Mentorship Bundler
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                        Create cross-course task card sequences from any video, Prelims test, or Mains test, group multiple sets
                        together, and sell the complete curriculum directly through Mentorship Cards.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/admin/mentorship"
                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-all border border-amber-200 flex items-center gap-1.5 shadow-2xs"
                    >
                        <span>🎓</span> Mentorship Cards ↗
                    </Link>
                    <Link
                        href="/admin/courses"
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 shadow-2xs"
                    >
                        <span>📚</span> All Courses ↗
                    </Link>
                </div>
            </div>

            {/* Navigation Tabs: 1. Task Card Sets vs 2. Task Card Groups */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('sets')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                        activeTab === 'sets'
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <span>🗂️</span>
                    <span>1. Task Card Sets ({setsList.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                        activeTab === 'groups'
                            ? 'bg-indigo-900 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <span>📦</span>
                    <span>2. Task Card Groups / Mentorship Bundles ({groupsList.length})</span>
                </button>
            </div>

            {/* ========================================================= */}
            {/* TAB 1: TASK CARD SETS MANAGEMENT                         */}
            {/* ========================================================= */}
            {activeTab === 'sets' && (
                <div className="space-y-6">
                    {/* Set Selection Bar */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1">
                            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                                Selected Task Card Set:
                            </label>
                            <select
                                value={selectedSetId}
                                onChange={(e) => setSelectedSetId(e.target.value)}
                                className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 flex-1 max-w-md"
                            >
                                <option value="new">+ Create New Task Card Set...</option>
                                {setsList.map((s) => (
                                    <option key={s._id} value={s._id}>
                                        [{s.track}] {s.title} ({s.totalCards} cards)
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={() => setSelectedSetId('new')}
                                className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                            >
                                + New Set
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedSetId !== 'new' && (
                                <button
                                    onClick={handleDeleteSet}
                                    className="px-3.5 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Delete Set
                                </button>
                            )}
                            <button
                                onClick={handleSaveSet}
                                disabled={isSavingSet}
                                className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isSavingSet ? 'Saving...' : '💾 Save Set Sequence'}
                            </button>
                        </div>
                    </div>

                    {/* Set Metadata Editor */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 4k:grid-cols-6 gap-4">
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs font-bold text-slate-700">Set Name / Subject Track *</label>
                                <input
                                    type="text"
                                    value={setTitle}
                                    onChange={(e) => setSetTitle(e.target.value)}
                                    placeholder="e.g. Polity Foundation - 25 Days, Modern History Module"
                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Track Category *</label>
                                <select
                                    value={setTrack}
                                    onChange={(e) => setSetTrack(e.target.value as TrackType)}
                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                >
                                    <option value="GS">GS Foundation</option>
                                    <option value="Optional">Optional Subject</option>
                                    <option value="Essay">Essay</option>
                                    <option value="CA">Current Affairs</option>
                                    <option value="CSAT">CSAT</option>
                                    <option value="Tests">Test Series Track</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Set Description (Optional)</label>
                                <input
                                    type="text"
                                    value={setDescription}
                                    onChange={(e) => setSetDescription(e.target.value)}
                                    placeholder="e.g. Constitutional frameworks & statutory bodies"
                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                        </div>

                        {/* Status Messages */}
                        {setStatusMsg && (
                            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                                {setStatusMsg}
                            </p>
                        )}
                        {setErrorMsg && (
                            <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl">
                                {setErrorMsg}
                            </p>
                        )}
                    </div>

                    {/* Action Bar for Adding Cards */}
                    <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                                Sequence Cards in This Set:
                            </span>
                            <span className="text-xs bg-slate-800 text-amber-300 px-2.5 py-0.5 rounded-full font-mono font-bold border border-slate-700">
                                {setCards.length} Study Days
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => {
                                    setVideoSearchQuery('');
                                    setVideoCourseFilter('');
                                    setShowVideoPickerModal(true);
                                }}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                            >
                                <span>🎬</span> Add Video from Any Course
                            </button>

                            <button
                                onClick={() => {
                                    setEditingCardIndex(null);
                                    if (ptsCatalog.length > 0) {
                                        setPtsSelectedSeriesId(ptsCatalog[0]._id);
                                        setPtsSelectedTestIdx(0);
                                    }
                                    setShowPtsModal(true);
                                }}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                            >
                                <span>📝</span> Insert PTS Test Card
                            </button>

                            <button
                                onClick={() => {
                                    setEditingCardIndex(null);
                                    if (mtsCatalog.length > 0) {
                                        setMtsSelectedSeriesId(mtsCatalog[0]._id);
                                        setMtsSelectedTestIdx(0);
                                    }
                                    setShowMtsModal(true);
                                }}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                            >
                                <span>✍️</span> Insert MTS Test Card
                            </button>

                            <button
                                onClick={() => {
                                    setEditingCardIndex(null);
                                    setVideoForm({
                                        title: `Day ${setCards.length + 1} Study Session`,
                                        cardType: 'video',
                                    });
                                    setShowVideoModal(true);
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all border border-slate-700"
                            >
                                <span>➕</span> Blank Card
                            </button>
                        </div>
                    </div>

                    {/* Cards Sequence Timeline */}
                    {isLoadingSetDetails ? (
                        <div className="p-12 text-center text-slate-500 font-medium">Loading set cards...</div>
                    ) : setCards.length === 0 ? (
                        <div className="bg-white p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-3">
                            <span className="text-3xl">📭</span>
                            <h3 className="text-sm font-bold text-slate-700">No Task Cards in this Set Yet</h3>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                                Click <strong className="text-slate-800">"Add Video from Any Course"</strong> above to pick any video
                                across all your course materials, or insert PTS/MTS tests to build this study set.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {setCards.map((card, idx) => (
                                <div
                                    key={idx}
                                    className={`bg-white rounded-2xl p-4 border transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                        card.cardType === 'pts_test'
                                            ? 'border-blue-200 bg-blue-50/20'
                                            : card.cardType === 'mts_test'
                                            ? 'border-rose-200 bg-rose-50/20'
                                            : 'border-slate-200'
                                    }`}
                                >
                                    <div className="flex items-start md:items-center gap-3 flex-1">
                                        <div className="flex flex-col items-center justify-center min-w-[54px] h-[54px] bg-slate-900 text-white rounded-xl font-mono">
                                            <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                                                Day
                                            </span>
                                            <span className="text-base font-black">
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                                                        card.cardType === 'pts_test'
                                                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                                                            : card.cardType === 'mts_test'
                                                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                                                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                    }`}
                                                >
                                                    {card.cardType === 'pts_test'
                                                        ? '📝 Prelims Test'
                                                        : card.cardType === 'mts_test'
                                                        ? '✍️ Mains Test'
                                                        : '🎬 Video & Notes'}
                                                </span>

                                                {card.sourceCourseTitle && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                                                        Source: {card.sourceCourseTitle}
                                                        {card.sourceTopicTitle ? ` → ${card.sourceTopicTitle}` : ''}
                                                    </span>
                                                )}

                                                {card.prelimsQuizId && (
                                                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                                                        ✓ Prelims MCQ
                                                    </span>
                                                )}

                                                {card.mainsQuestionText && (
                                                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                                                        ✓ Mains Q&A
                                                    </span>
                                                )}
                                            </div>

                                            <h4 className="text-sm font-bold text-slate-900">{card.title}</h4>
                                            {card.description && (
                                                <p className="text-xs text-slate-500 line-clamp-1">{card.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons: Move Up / Down, Edit, Delete */}
                                    <div className="flex items-center gap-1.5 self-end md:self-center">
                                        <button
                                            type="button"
                                            onClick={() => moveCard(idx, -1)}
                                            disabled={idx === 0}
                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs transition-colors"
                                            title="Move Up"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveCard(idx, 1)}
                                            disabled={idx === setCards.length - 1}
                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs transition-colors"
                                            title="Move Down"
                                        >
                                            ▼
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openEditCard(card, idx)}
                                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteCard(idx)}
                                            className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs transition-colors"
                                            title="Delete"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: TASK CARD GROUPS MANAGEMENT                       */}
            {/* ========================================================= */}
            {activeTab === 'groups' && (
                <div className="space-y-6">
                    {/* Group Selection Bar */}
                    <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1">
                            <label className="text-xs font-bold text-indigo-950 whitespace-nowrap">
                                Selected Task Card Group:
                            </label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="px-3.5 py-2 bg-indigo-50/50 border border-indigo-300 rounded-xl text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900 flex-1 max-w-md"
                            >
                                <option value="new">+ Create New Task Card Group...</option>
                                {groupsList.map((g) => (
                                    <option key={g._id} value={g._id}>
                                        {g.title} ({g.totalSets} sets · {g.totalCards} study cards)
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={() => setSelectedGroupId('new')}
                                className="px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shadow-2xs"
                            >
                                + New Group
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedGroupId !== 'new' && (
                                <button
                                    onClick={handleDeleteGroup}
                                    className="px-3.5 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Delete Group
                                </button>
                            )}
                            <button
                                onClick={handleSaveGroup}
                                disabled={isSavingGroup}
                                className="px-5 py-2 bg-indigo-900 text-white hover:bg-indigo-800 rounded-xl text-xs font-black shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isSavingGroup ? 'Saving...' : '💾 Save Group Bundle'}
                            </button>
                        </div>
                    </div>

                    {/* Group Metadata & Linked Mentorship Status */}
                    <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-2xs space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 4k:grid-cols-5 gap-4">
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs font-bold text-slate-700">Group Name (Used to Sell in Mentorship Card) *</label>
                                <input
                                    type="text"
                                    value={groupTitle}
                                    onChange={(e) => setGroupTitle(e.target.value)}
                                    placeholder="e.g. UPSC 2027 Integrated Mentorship Program, GS Mains Mentorship Batch 1"
                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-900"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Group Description</label>
                                <input
                                    type="text"
                                    value={groupDescription}
                                    onChange={(e) => setGroupDescription(e.target.value)}
                                    placeholder="e.g. Bundles Polity, Economy, Ethics and Mains Test Series"
                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-900"
                                />
                            </div>
                        </div>

                        {/* Linked Mentorship Course Notice */}
                        {currentGroupObj?.linkedMentorshipCourses && currentGroupObj.linkedMentorshipCourses.length > 0 && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                                    <span>🎓</span> Currently Linked & Sold By:{' '}
                                    {currentGroupObj.linkedMentorshipCourses.map((mc) => mc.title).join(', ')}
                                </span>
                                <Link
                                    href="/admin/mentorship"
                                    className="text-emerald-700 font-bold hover:underline"
                                >
                                    Manage in Mentorship CMS ↗
                                </Link>
                            </div>
                        )}

                        {/* Status Messages */}
                        {groupStatusMsg && (
                            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                                {groupStatusMsg}
                            </p>
                        )}
                        {groupErrorMsg && (
                            <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl">
                                {groupErrorMsg}
                            </p>
                        )}
                    </div>

                    {/* Group Sets Assembly Area */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Ordered Sets inside this Mentorship Group
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Combine multiple Task Card Sets in any order. This order forms the student&apos;s active curriculum roadmap.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={addSetPickerId}
                                    onChange={(e) => setAddSetPickerId(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                                >
                                    <option value="">-- Choose Set to Add --</option>
                                    {setsList.map((s) => (
                                        <option key={s._id} value={s._id}>
                                            [{s.track}] {s.title} ({s.totalCards} cards)
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleAddSetToGroup}
                                    disabled={!addSetPickerId}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40"
                                >
                                    + Add Set
                                </button>
                            </div>
                        </div>

                        {/* Total Summary Strip */}
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span>📦 Total Sets: <strong className="text-indigo-900">{groupSets.length}</strong></span>
                            <span>·</span>
                            <span>🗓️ Total Study Days in Group: <strong className="text-indigo-900">{totalGroupStudyDays} Days</strong></span>
                        </div>

                        {/* Ordered Sets List */}
                        {groupSets.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                                No sets added to this group yet. Select a Task Card Set from the dropdown above and click &quot;+ Add Set&quot;.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {groupSets.map((s, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 rounded-lg bg-indigo-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                    <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                                        {s.track}
                                                    </span>
                                                    <span>{s.cardCount} Study Days / Task Cards</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => moveGroupSet(idx, -1)}
                                                disabled={idx === 0}
                                                className="w-7 h-7 rounded bg-white hover:bg-slate-200 border text-slate-700 disabled:opacity-30 flex items-center justify-center text-xs font-bold"
                                            >
                                                ▲
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveGroupSet(idx, 1)}
                                                disabled={idx === groupSets.length - 1}
                                                className="w-7 h-7 rounded bg-white hover:bg-slate-200 border text-slate-700 disabled:opacity-30 flex items-center justify-center text-xs font-bold"
                                            >
                                                ▼
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeGroupSet(idx)}
                                                className="w-7 h-7 rounded bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 1: CROSS-COURSE VIDEO CATALOG PICKER               */}
            {/* ========================================================= */}
            {showVideoPickerModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <span>🎬</span> Pick Any Video from Any Course
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Browse across all published courses and topics to insert any lecture into this Task Card Set.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowVideoPickerModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Search & Filter Toolbar */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                value={videoSearchQuery}
                                onChange={(e) => setVideoSearchQuery(e.target.value)}
                                placeholder="Search by video title, topic, or lecture keywords..."
                                className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            />

                            <select
                                value={videoCourseFilter}
                                onChange={(e) => setVideoCourseFilter(e.target.value)}
                                className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            >
                                <option value="">All Courses ({videoCatalog.length} videos)</option>
                                {videoCatalogCourses.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Video List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredVideos.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 text-xs">
                                    No videos found matching your filters.
                                </div>
                            ) : (
                                filteredVideos.map((v) => (
                                    <div
                                        key={v._id}
                                        className="p-3.5 bg-white border border-slate-200 hover:border-slate-400 rounded-xl flex items-center justify-between gap-4 transition-all hover:shadow-xs group"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[10px] font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                                                    {v.courseTitle}
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                    → Topic: <strong>{v.topicTitle}</strong>
                                                </span>
                                                {v.prelimsQuizId && (
                                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                                                        MCQ Quiz
                                                    </span>
                                                )}
                                                {v.mainsQuestionText && (
                                                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                                                        Mains Q&A
                                                    </span>
                                                )}
                                            </div>

                                            <h4 className="text-xs font-bold text-slate-900">{v.title}</h4>
                                            {v.videoUrl && (
                                                <p className="text-[11px] text-slate-400 font-mono truncate max-w-lg">
                                                    {v.videoUrl}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handlePickVideoFromCatalog(v)}
                                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 whitespace-nowrap"
                                        >
                                            Select Video ➔
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 2: VIDEO CARD DETAILS EDITOR                       */}
            {/* ========================================================= */}
            {showVideoModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <span>🎬</span> {editingCardIndex !== null ? `Edit Card #${editingCardIndex + 1}` : 'Configure Task Card'}
                            </h3>
                            <button
                                onClick={() => setShowVideoModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                            {videoForm.sourceCourseTitle && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
                                    <span>
                                        📚 <strong>Origin:</strong> {videoForm.sourceCourseTitle} → {videoForm.sourceTopicTitle}
                                    </span>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="font-bold text-slate-700">Card Title *</label>
                                <input
                                    type="text"
                                    value={videoForm.title || ''}
                                    onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700">Video Provider</label>
                                    <select
                                        value={videoForm.videoProvider || 'youtube'}
                                        onChange={(e) => setVideoForm({ ...videoForm, videoProvider: e.target.value as VideoProviderType })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                                    >
                                        <option value="youtube">YouTube</option>
                                        <option value="bunny">Bunny.net</option>
                                        <option value="custom">Custom MP4 URL</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700">Video URL / Video ID</label>
                                    <input
                                        type="text"
                                        value={videoForm.videoUrl || ''}
                                        onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                                        placeholder="https://youtu.be/... or Bunny video ID"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-slate-700">Study Notes (Markdown / Text)</label>
                                <textarea
                                    rows={4}
                                    value={videoForm.notesText || ''}
                                    onChange={(e) => setVideoForm({ ...videoForm, notesText: e.target.value })}
                                    placeholder="Enter comprehensive revision notes for this study card..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px]"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700">Attach Prelims Practice Quiz</label>
                                    <select
                                        value={videoForm.prelimsQuizId || ''}
                                        onChange={(e) => setVideoForm({ ...videoForm, prelimsQuizId: e.target.value || null })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                                    >
                                        <option value="">-- No Quiz Attached --</option>
                                        {quizzesList.map((q) => (
                                            <option key={q._id} value={q._id}>
                                                {q.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700">Attach Mains Question Text</label>
                                    <input
                                        type="text"
                                        value={videoForm.mainsQuestionText || ''}
                                        onChange={(e) => setVideoForm({ ...videoForm, mainsQuestionText: e.target.value })}
                                        placeholder="e.g. Critically analyze the evolution of..."
                                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowVideoModal(false)}
                                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveVideoCard}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs"
                            >
                                Save Card to Set
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 3: PTS TEST PICKER                                  */}
            {/* ========================================================= */}
            {showPtsModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-blue-200">
                        <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <span>📝</span> Insert Prelims Test Series (PTS) Card
                            </h3>
                            <button
                                onClick={() => setShowPtsModal(false)}
                                className="w-8 h-8 rounded-full bg-blue-800 text-blue-200 flex items-center justify-center font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="font-bold text-slate-700">Select Prelims Test Series</label>
                                <select
                                    value={ptsSelectedSeriesId}
                                    onChange={(e) => {
                                        setPtsSelectedSeriesId(e.target.value);
                                        setPtsSelectedTestIdx(0);
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
                                >
                                    {ptsCatalog.map((s) => (
                                        <option key={s._id} value={s._id}>
                                            {s.title} ({s.tests.length} tests)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {ptsSelectedSeriesId && (
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700">Select Test from this Series</label>
                                    <select
                                        value={ptsSelectedTestIdx}
                                        onChange={(e) => setPtsSelectedTestIdx(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
                                    >
                                        {ptsCatalog
                                            .find((s) => s._id === ptsSelectedSeriesId)
                                            ?.tests.map((t, idx) => (
                                                <option key={idx} value={idx}>
                                                    Test #{idx + 1}: {t.title} {t.syllabus ? `(${t.syllabus})` : ''}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setShowPtsModal(false)}
                                className="px-4 py-2 bg-white text-slate-700 border text-xs font-bold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePtsCard}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs"
                            >
                                Insert PTS Test Card
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 4: MTS TEST PICKER                                  */}
            {/* ========================================================= */}
            {showMtsModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-rose-200">
                        <div className="p-4 bg-rose-900 text-white flex items-center justify-between">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <span>✍️</span> Insert Mains Test Series (MTS) Card
                            </h3>
                            <button
                                onClick={() => setShowMtsModal(false)}
                                className="w-8 h-8 rounded-full bg-rose-800 text-rose-200 flex items-center justify-center font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="font-bold text-slate-700">Select Mains Test Series</label>
                                <select
                                    value={mtsSelectedSeriesId}
                                    onChange={(e) => {
                                        setMtsSelectedSeriesId(e.target.value);
                                        setMtsSelectedTestIdx(0);
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
                                >
                                    {mtsCatalog.map((s) => (
                                        <option key={s._id} value={s._id}>
                                            {s.title} ({s.tests.length} tests)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {mtsSelectedSeriesId && (
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700">Select Test from this Series</label>
                                    <select
                                        value={mtsSelectedTestIdx}
                                        onChange={(e) => setMtsSelectedTestIdx(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
                                    >
                                        {mtsCatalog
                                            .find((s) => s._id === mtsSelectedSeriesId)
                                            ?.tests.map((t, idx) => (
                                                <option key={idx} value={idx}>
                                                    Test #{idx + 1}: {t.title} {t.syllabus ? `(${t.syllabus})` : ''}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setShowMtsModal(false)}
                                className="px-4 py-2 bg-white text-slate-700 border text-xs font-bold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveMtsCard}
                                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-xs"
                            >
                                Insert MTS Test Card
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminTaskCardsPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-medium">Loading sequencer...</div>}>
            <TaskCardsManagerContent />
        </Suspense>
    );
}
