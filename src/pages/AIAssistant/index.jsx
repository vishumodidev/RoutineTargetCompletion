import { useContext, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { TaskContext } from '../../context/TaskContext';
import { InvestmentContext } from '../../context/InvestmentContext';
import { planService } from '../../services/planService';
import { reviewService } from '../../services/reviewService';
import { ROUTINE_TEMPLATES } from '../../services/routineService';
import { generateDailyBigFive, DAY_TYPES } from '../../utils/dailyPlanner';
import { aiService } from '../../services/aiService';
import {
  signInWithGoogle,
  signOutFromGoogle,
  subscribeAuth,
  AUTH_STATUS
} from '../../services/googleAuthService';
import { googleCalendarService } from '../../services/googleCalendarService';
import { googleTasksService } from '../../services/googleTasksService';
import {
  getIsoWeekKey,
  getWeekDateRange,
  aggregateWeeklyMetrics,
  DEFERRAL_REASONS
} from '../../utils/reviewAggregator';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Circle, 
  ArrowUp, 
  ArrowDown, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  Save, 
  ShieldCheck, 
  Flame, 
  Target, 
  Layers, 
  X, 
  Info, 
  Check, 
  PauseCircle,
  HelpCircle,
  Sun,
  Moon,
  CalendarDays,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  History,
  FileText,
  AlertCircle,
  Link2,
  Unlink,
  CheckSquare,
  ExternalLink,
  Plus,
  Bot,
  MessageSquare,
  Send,
  Wand2,
  Lightbulb
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIAssistant() {
  const { user } = useContext(AuthContext);
  const { tasks, toggleTaskComplete, updateTask, createTask } = useContext(TaskContext);
  const { goals } = useContext(InvestmentContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state: 'big5' | 'morning' | 'evening' | 'weekly' | 'chat'
  const activeTab = searchParams.get('tab') || 'big5';
  const setActiveTab = (tab) => setSearchParams({ tab });

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dayType, setDayType] = useState('NORMAL');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPlan, setSavedPlan] = useState(null);

  // Google Integration State
  const [googleAuth, setGoogleAuth] = useState(() => ({
    status: AUTH_STATUS.DISCONNECTED,
    accessToken: null,
    expiresAt: null,
    userEmail: null,
    error: null,
    isMock: false,
    isConfigured: false
  }));
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarBusyMinutes, setCalendarBusyMinutes] = useState(0);
  const [calendarConflicts, setCalendarConflicts] = useState([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleModalTab, setGoogleModalTab] = useState('calendar'); // 'calendar' | 'tasks'

  // Google Tasks Import State
  const [googleTaskLists, setGoogleTaskLists] = useState([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState('@default');
  const [googleTasksList, setGoogleTasksList] = useState([]);
  const [selectedImportIds, setSelectedImportIds] = useState([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Active planning state (Daily Big 5)
  const [recommendedTasks, setRecommendedTasks] = useState([]);
  const [overflowTasks, setOverflowTasks] = useState([]);
  const [blockedAlerts, setBlockedAlerts] = useState([]);
  const [availableMinutes, setAvailableMinutes] = useState(480);
  const [plannedMinutes, setPlannedMinutes] = useState(0);
  const [overallSummary, setOverallSummary] = useState('');

  // Modals & UI states
  const [explainingTask, setExplainingTask] = useState(null);
  const [deferringTask, setDeferringTask] = useState(null);
  const [deferReason, setDeferReason] = useState('Capacity constraint; moved to tomorrow');

  // Morning Planning State
  const [morningNotes, setMorningNotes] = useState('');
  const [savedMorningReview, setSavedMorningReview] = useState(null);

  // Evening Review State
  const [eveningReflection, setEveningReflection] = useState('');
  const [taskDeferralMap, setTaskDeferralMap] = useState({});
  const [savedEveningReview, setSavedEveningReview] = useState(null);

  // Weekly Review State
  const [selectedWeekKey, setSelectedWeekKey] = useState(() => getIsoWeekKey(new Date()));
  const [weeklyReflection, setWeeklyReflection] = useState('');
  const [savedWeeklyReview, setSavedWeeklyReview] = useState(null);
  const [allWeeklyReviews, setAllWeeklyReviews] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Phase 6 AI Reasoning State: Task Breakdown
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [breakingDownTask, setBreakingDownTask] = useState(null);
  const [subtaskBreakdown, setSubtaskBreakdown] = useState([]);
  const [selectedSubtaskIndices, setSelectedSubtaskIndices] = useState([]);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [breakdownReasoning, setBreakdownReasoning] = useState('');
  const [breakdownIsAi, setBreakdownIsAi] = useState(false);

  // Phase 6 AI Reasoning State: Planning Advice & Chat
  const [aiPlanningAdvice, setAiPlanningAdvice] = useState(null);
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);
  const [aiReviewInsights, setAiReviewInsights] = useState(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);

  // Phase 6 AI Assistant Conversational Chat
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello Vishu! I am your Antigravity Personal Productivity Assistant. I can explain your task priorities, break down complex projects into subtasks, evaluate your daily capacity, and analyze your weekly reviews.',
      isAi: false
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Subscribe to Google Auth changes
  useEffect(() => {
    const unsubscribe = subscribeAuth((state) => {
      setGoogleAuth(state);
    });
    return unsubscribe;
  }, []);

  // Fetch Google Calendar Events when auth is connected or selectedDate changes
  useEffect(() => {
    async function loadCalendar() {
      if (googleAuth.status !== AUTH_STATUS.CONNECTED) {
        setCalendarEvents([]);
        setCalendarBusyMinutes(0);
        setCalendarConflicts([]);
        return;
      }
      setIsCalendarLoading(true);
      try {
        const res = await googleCalendarService.getEventsForDate(selectedDate);
        if (res.success) {
          setCalendarEvents(res.events || []);
          setCalendarBusyMinutes(res.busyMinutes || 0);
          setCalendarConflicts(res.conflicts || []);
        } else {
          setCalendarEvents([]);
          setCalendarBusyMinutes(0);
          setCalendarConflicts([]);
        }
      } catch (err) {
        console.warn('Google Calendar fetch error:', err);
      } finally {
        setIsCalendarLoading(false);
      }
    }
    loadCalendar();
  }, [googleAuth.status, selectedDate]);

  // Load saved plan for selected date, or generate freshly
  useEffect(() => {
    async function loadPlanAndReviews() {
      if (!user) return;
      setLoading(true);
      try {
        // 1. Load Daily Plan
        const remotePlan = await planService.getDailyPlan(user.userId, selectedDate);
        setSavedPlan(remotePlan);

        if (remotePlan) {
          setDayType(remotePlan.dayType || 'NORMAL');
        }

        const genResult = generateDailyBigFive(tasks, {
          planDate: selectedDate,
          dayType: remotePlan?.dayType || dayType,
          goals,
          existingPlan: remotePlan,
          calendarEvents
        });

        setAvailableMinutes(genResult.availableMinutes);
        setPlannedMinutes(genResult.plannedMinutes);
        setRecommendedTasks(genResult.recommendedTasks);
        setOverflowTasks(genResult.overflowTasks);
        setBlockedAlerts(genResult.blockedAlerts);
        setOverallSummary(genResult.overallSummary);

        // 2. Load Reviews for this date
        const mReview = await reviewService.getReview(user.userId, 'MORNING', selectedDate);
        setSavedMorningReview(mReview);
        if (mReview?.reflectionText) setMorningNotes(mReview.reflectionText);

        const eReview = await reviewService.getReview(user.userId, 'EVENING', selectedDate);
        setSavedEveningReview(eReview);
        if (eReview?.reflectionText) setEveningReflection(eReview.reflectionText);
        if (eReview?.deferrals && Array.isArray(eReview.deferrals)) {
          const defMap = {};
          eReview.deferrals.forEach(d => {
            if (d.taskId) defMap[d.taskId] = d.reason || d.reasonCategory;
          });
          setTaskDeferralMap(defMap);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load plan or reviews');
      } finally {
        setLoading(false);
      }
    }

    loadPlanAndReviews();
  }, [user, selectedDate, tasks, goals, calendarEvents]);

  // Load Weekly Review and History when week changes
  useEffect(() => {
    async function loadWeekly() {
      if (!user) return;
      try {
        const wReview = await reviewService.getReview(user.userId, 'WEEKLY', selectedWeekKey);
        setSavedWeeklyReview(wReview);
        if (wReview?.reflectionText) setWeeklyReflection(wReview.reflectionText);

        const history = await reviewService.getReviewsHistory(user.userId, 'WEEKLY');
        setAllWeeklyReviews(history || []);
      } catch (err) {
        console.error('Failed to load weekly review:', err);
      }
    }
    loadWeekly();
  }, [user, selectedWeekKey]);

  // Handle Day Type change
  const handleDayTypeChange = (newType) => {
    setDayType(newType);
    const genResult = generateDailyBigFive(tasks, {
      planDate: selectedDate,
      dayType: newType,
      goals,
      existingPlan: savedPlan,
      calendarEvents
    });
    setAvailableMinutes(genResult.availableMinutes);
    setPlannedMinutes(genResult.plannedMinutes);
    setRecommendedTasks(genResult.recommendedTasks);
    setOverflowTasks(genResult.overflowTasks);
    setBlockedAlerts(genResult.blockedAlerts);
    setOverallSummary(genResult.overallSummary);
  };

  // Re-run planner ignoring previous plan
  const handleRegenerate = () => {
    const genResult = generateDailyBigFive(tasks, {
      planDate: selectedDate,
      dayType,
      goals,
      existingPlan: null,
      calendarEvents
    });
    setAvailableMinutes(genResult.availableMinutes);
    setPlannedMinutes(genResult.plannedMinutes);
    setRecommendedTasks(genResult.recommendedTasks);
    setOverflowTasks(genResult.overflowTasks);
    setBlockedAlerts(genResult.blockedAlerts);
    setOverallSummary(genResult.overallSummary);
    toast.success('Regenerated plan with latest backlog priorities');
  };

  // Google Connect / Disconnect handlers
  const handleConnectGoogle = async () => {
    const res = await signInWithGoogle();
    if (res.success) {
      toast.success(res.isMock ? 'Connected Google Account (Demo/Mock Mode)' : 'Connected Google Account successfully!');
    } else {
      toast.error(res.error || 'Failed to connect Google account');
    }
  };

  const handleDisconnectGoogle = async () => {
    await signOutFromGoogle();
    setCalendarEvents([]);
    setCalendarBusyMinutes(0);
    setCalendarConflicts([]);
    setGoogleTasksList([]);
    toast.success('Disconnected from Google');
  };

  // Load Google Task lists and tasks for import
  const handleOpenGoogleModal = async (initialTab = 'calendar') => {
    setGoogleModalTab(initialTab);
    setShowGoogleModal(true);

    if (googleAuth.status === AUTH_STATUS.CONNECTED) {
      if (initialTab === 'tasks') {
        loadGoogleTasks('@default');
      }
    }
  };

  const loadGoogleTasks = async (listId = '@default') => {
    setIsTasksLoading(true);
    try {
      const listsRes = await googleTasksService.getTaskLists();
      if (listsRes.success) {
        setGoogleTaskLists(listsRes.lists || []);
      }
      const tasksRes = await googleTasksService.getTasks(listId);
      if (tasksRes.success) {
        setGoogleTasksList(tasksRes.tasks || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Google tasks');
    } finally {
      setIsTasksLoading(false);
    }
  };

  // Handle Google Task Import selection
  const handleToggleTaskSelection = (taskId) => {
    setSelectedImportIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleImportSelectedTasks = async () => {
    if (selectedImportIds.length === 0) {
      toast.error('No tasks selected for import');
      return;
    }

    setIsImporting(true);
    let importedCount = 0;
    try {
      for (const id of selectedImportIds) {
        const gtask = googleTasksList.find(t => t.id === id);
        if (gtask) {
          if (!googleTasksService.isAlreadyImported(gtask.id, tasks)) {
            const mapped = googleTasksService.mapGoogleTaskToLocalTask(gtask);
            if (createTask) {
              await createTask(mapped);
              importedCount++;
            }
          }
        }
      }
      setSelectedImportIds([]);
      toast.success(`Imported ${importedCount} tasks from Google Tasks to your backlog!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed during task import');
    } finally {
      setIsImporting(false);
    }
  };

  // Phase 6: AI Task Breakdown Handler
  const handleRequestBreakdown = async (task) => {
    setBreakingDownTask(task);
    setShowBreakdownModal(true);
    setIsBreakdownLoading(true);
    try {
      const res = await aiService.breakdownTask(user?.userId, task);
      if (res?.success && res.data?.subtasks) {
        setSubtaskBreakdown(res.data.subtasks);
        setSelectedSubtaskIndices(res.data.subtasks.map((_, idx) => idx));
        setBreakdownReasoning(res.data.reasoning || '');
        setBreakdownIsAi(!!res.isAi);
      } else {
        toast.error('Could not generate breakdown.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error generating task breakdown');
    } finally {
      setIsBreakdownLoading(false);
    }
  };

  // Phase 6: Import AI Subtasks to Backlog
  const handleImportSubtasksToBacklog = async () => {
    if (!breakingDownTask || selectedSubtaskIndices.length === 0) {
      toast.error('No subtasks selected for import');
      return;
    }

    let addedCount = 0;
    try {
      for (const idx of selectedSubtaskIndices) {
        const sub = subtaskBreakdown[idx];
        if (sub && createTask) {
          // Check for duplicate title under same task/project
          const isDuplicate = tasks.some(t => t.title === sub.title);
          if (!isDuplicate) {
            await createTask({
              title: sub.title,
              description: sub.description || '',
              nextAction: sub.nextAction || sub.title,
              estimatedDuration: sub.estimatedDuration || 45,
              category: sub.category || breakingDownTask.category || 'General',
              projectArea: breakingDownTask.projectArea || breakingDownTask.title,
              linkedGoalId: breakingDownTask.linkedGoalId || '',
              dependencies: sub.dependencies || '',
              status: 'Not Started',
              source: 'AI Breakdown'
            });
            addedCount++;
          }
        }
      }
      setShowBreakdownModal(false);
      toast.success(`Added ${addedCount} subtasks to your backlog!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add subtasks');
    }
  };

  // Phase 6: Ask AI Planning Advice
  const handleAskAdvice = async (question) => {
    setIsAdviceLoading(true);
    try {
      const res = await aiService.askPlanningAdvice(user?.userId, question, {
        dailyPlan: savedPlan,
        tasks: recommendedTasks,
        calendarEvents
      });
      if (res?.success && res.data) {
        setAiPlanningAdvice(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to get planning advice');
    } finally {
      setIsAdviceLoading(false);
    }
  };

  // Phase 6: Generate Review Insights
  const handleGenerateReviewInsights = async () => {
    setIsInsightsLoading(true);
    try {
      const res = await aiService.generateReviewInsights(user?.userId, weeklyMetrics);
      if (res?.success && res.data) {
        setAiReviewInsights(res.data);
        toast.success('Generated weekly synthesis insights!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate insights');
    } finally {
      setIsInsightsLoading(false);
    }
  };

  // Phase 6: Conversational Chat Handler
  const handleSendChatMessage = async (textToSend = null) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    const userMsg = { role: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await aiService.chatWithAssistant(user?.userId, text, chatMessages, {
        dailyPlan: savedPlan,
        tasks: recommendedTasks,
        goals,
        calendarEvents
      });

      const assistantMsg = {
        role: 'assistant',
        text: res.reply,
        isAi: res.isAi,
        suggestedAction: res.suggestedAction
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'I encountered an error retrieving data. Let me know which priority you would like to inspect.', isAi: false }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Toggle Acceptance
  const handleToggleAcceptance = (taskId) => {
    setRecommendedTasks(prev => prev.map(t => {
      if (t.taskId === taskId) {
        const nextState = !(t.isAccepted !== false);
        return { ...t, isAccepted: nextState };
      }
      return t;
    }));
  };

  // Inline Duration Edit
  const handleDurationChange = (taskId, newMinutes) => {
    const num = Math.max(15, Math.min(480, Number(newMinutes) || 45));
    setRecommendedTasks(prev => prev.map(t => {
      if (t.taskId === taskId) {
        return { ...t, duration: num, estimatedDuration: num };
      }
      return t;
    }));
    updateTask(taskId, { estimatedDuration: num });
  };

  // Reorder Tasks (Move Up/Down)
  const handleMoveTask = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= recommendedTasks.length) return;

    setRecommendedTasks(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Confirm Deferral Dialog
  const handleOpenDeferral = (task) => {
    setDeferringTask(task);
    setDeferReason('Capacity constraint; moved to tomorrow');
  };

  const handleConfirmDeferral = () => {
    if (!deferringTask) return;
    setRecommendedTasks(prev => prev.filter(t => t.taskId !== deferringTask.taskId));
    setOverflowTasks(prev => [
      ...prev,
      { ...deferringTask, deferralReason: deferReason }
    ]);
    setDeferringTask(null);
    toast.success(`Deferred "${deferringTask.title}"`);
  };

  // Save Daily Plan to backend
  const handleSavePlan = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const acceptanceStatuses = {};
      recommendedTasks.forEach(t => {
        acceptanceStatuses[t.taskId] = t.isAccepted !== undefined ? t.isAccepted : true;
      });

      const planPayload = {
        planDate: selectedDate,
        dayType,
        availableMinutes,
        plannedMinutes: recommendedTasks.filter(t => t.isAccepted !== false).reduce((sum, t) => sum + (t.duration || 45), 0),
        selectedTaskIds: recommendedTasks.map(t => t.taskId),
        taskOrder: recommendedTasks.map(t => t.taskId),
        acceptanceStatuses,
        deferredTasks: overflowTasks.map(t => ({ taskId: t.taskId, title: t.title, reason: t.deferralReason })),
        selectionRationale: overallSummary
      };

      const saved = await planService.saveDailyPlan(user.userId, planPayload);
      setSavedPlan(saved);
      toast.success('Daily Big 5 plan saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save daily plan');
    } finally {
      setSaving(false);
    }
  };

  // Save Morning Review
  const handleSaveMorningReview = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await handleSavePlan();

      const reviewPayload = {
        reviewType: 'MORNING',
        periodKey: selectedDate,
        linkedPlanId: savedPlan?.planId || '',
        metrics: {
          plannedCount: acceptedTasks.length,
          plannedMinutes: acceptedMinutes,
          availableMinutes,
          calendarBusyMinutes,
          dayType
        },
        reflectionText: morningNotes,
        deferrals: overflowTasks.map(t => ({ taskId: t.taskId, title: t.title, reason: t.deferralReason })),
        nextSteps: acceptedTasks.map(t => t.title)
      };

      const saved = await reviewService.saveReview(user.userId, reviewPayload);
      setSavedMorningReview(saved);
      toast.success('Morning Planning locked & confirmed!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save morning review');
    } finally {
      setSaving(false);
    }
  };

  // Save Evening Review
  const handleSaveEveningReview = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const deferralsList = [];
      const plannedIds = (savedPlan?.selectedTaskIds || recommendedTasks.map(t => t.taskId));
      const plannedObjs = tasks.filter(t => plannedIds.includes(t.taskId));
      const incompleteObjs = plannedObjs.filter(t => t.status !== 'Completed');

      incompleteObjs.forEach(t => {
        deferralsList.push({
          taskId: t.taskId,
          title: t.title,
          reasonCategory: taskDeferralMap[t.taskId] || 'Insufficient time',
          notes: ''
        });
      });

      const reviewPayload = {
        reviewType: 'EVENING',
        periodKey: selectedDate,
        linkedPlanId: savedPlan?.planId || '',
        metrics: {
          tasksPlanned: plannedObjs.length,
          tasksCompleted: plannedObjs.filter(t => t.status === 'Completed').length,
          completionRate: plannedObjs.length > 0
            ? Math.round((plannedObjs.filter(t => t.status === 'Completed').length / plannedObjs.length) * 100)
            : 0
        },
        reflectionText: eveningReflection,
        deferrals: deferralsList,
        nextSteps: tomorrowPriorities.map(t => t.title)
      };

      const saved = await reviewService.saveReview(user.userId, reviewPayload);
      setSavedEveningReview(saved);
      toast.success('Evening Review saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save evening review');
    } finally {
      setSaving(false);
    }
  };

  // Save Weekly Review
  const handleSaveWeeklyReview = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const reviewPayload = {
        reviewType: 'WEEKLY',
        periodKey: selectedWeekKey,
        metrics: {
          tasksPlannedCount: weeklyMetrics.tasksPlannedCount,
          tasksCompletedCount: weeklyMetrics.tasksCompletedCount,
          completionRate: weeklyMetrics.completionRate,
          overdueCount: weeklyMetrics.overdueCount,
          deferredCount: weeklyMetrics.deferredCount,
          estimatedMinutesTotal: weeklyMetrics.estimatedMinutesTotal,
          actualMinutesTotal: weeklyMetrics.actualMinutesTotal,
          hasActualDurationData: weeklyMetrics.hasActualDurationData
        },
        reflectionText: weeklyReflection,
        deferrals: Object.entries(weeklyMetrics.deferralReasonsSummary).map(([reason, count]) => ({ reason, count })),
        nextSteps: weeklyMetrics.suggestedNextWeekPriorities.map(t => t.title)
      };

      const saved = await reviewService.saveReview(user.userId, reviewPayload);
      setSavedWeeklyReview(saved);
      toast.success(`Weekly Review for ${selectedWeekKey} saved!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save weekly review');
    } finally {
      setSaving(false);
    }
  };

  // Derived calculations for Daily Big 5
  const acceptedTasks = recommendedTasks.filter(t => t.isAccepted !== false);
  const acceptedMinutes = acceptedTasks.reduce((sum, t) => sum + (t.duration || 45), 0);
  const utilizationPercent = Math.min(100, Math.round((acceptedMinutes / availableMinutes) * 100));

  // Determine local routine blocks for selected day
  const routineTemplateKey = useMemo(() => {
    const d = new Date(selectedDate);
    const day = isNaN(d.getDay()) ? 1 : d.getDay();
    if (day === 6) return 'saturday';
    if (day === 0) return 'sunday';
    return 'weekday';
  }, [selectedDate]);

  const routineBlocks = ROUTINE_TEMPLATES[routineTemplateKey] || [];

  // Tomorrow's suggested candidate tasks for Evening Review
  const tomorrowPriorities = useMemo(() => {
    const uncompleted = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled' && t.status !== 'Blocked');
    const enriched = uncompleted.map(t => ({
      ...t,
      score: t.priorityScore || 50
    })).sort((a, b) => b.score - a.score);
    return enriched.slice(0, 3);
  }, [tasks]);

  // Weekly review calculations
  const { startDate: weekStartDate, endDate: weekEndDate } = useMemo(() => {
    return getWeekDateRange(selectedWeekKey);
  }, [selectedWeekKey]);

  const weeklyMetrics = useMemo(() => {
    const dummyDailyPlans = savedPlan ? [savedPlan] : [];
    return aggregateWeeklyMetrics({
      tasks,
      dailyPlans: dummyDailyPlans,
      goals,
      startDate: weekStartDate,
      endDate: weekEndDate,
      todayDateStr: selectedDate
    });
  }, [tasks, savedPlan, goals, weekStartDate, weekEndDate, selectedDate]);

  // Weekly Navigation Handlers
  const handlePrevWeek = () => {
    const [yearStr, weekStr] = selectedWeekKey.split('-W');
    let y = parseInt(yearStr, 10);
    let w = parseInt(weekStr, 10) - 1;
    if (w < 1) {
      y -= 1;
      w = 52;
    }
    setSelectedWeekKey(`${y}-W${String(w).padStart(2, '0')}`);
  };

  const handleNextWeek = () => {
    const [yearStr, weekStr] = selectedWeekKey.split('-W');
    let y = parseInt(yearStr, 10);
    let w = parseInt(weekStr, 10) + 1;
    if (w > 52) {
      y += 1;
      w = 1;
    }
    setSelectedWeekKey(`${y}-W${String(w).padStart(2, '0')}`);
  };

  const getPriorityBadge = (score) => {
    if (score >= 80) return 'bg-red-500/20 text-red-400 border-red-500/40';
    if (score >= 60) return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    if (score >= 40) return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center text-text-primary">
            <Sparkles className="h-7 w-7 text-brand-primary mr-3 animate-pulse" />
            Personal AI Productivity Assistant
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Deterministic daily planning, morning commitments, evening reflections, and weekly reviews.
          </p>
        </div>

        {/* Global Toolbar: Date Selector + Google Integration Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Google Sync Button */}
          <button
            onClick={() => handleOpenGoogleModal('calendar')}
            className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              googleAuth.status === AUTH_STATUS.CONNECTED
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                : googleAuth.status === AUTH_STATUS.EXPIRED
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
                : 'bg-bg-card border-border-dark text-text-secondary hover:text-text-primary hover:border-brand-primary/40'
            }`}
            title="Google Calendar & Tasks Synchronization"
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-brand-primary" />
            <span>
              {googleAuth.status === AUTH_STATUS.CONNECTED 
                ? (calendarBusyMinutes > 0 ? `Google: ${calendarBusyMinutes}m meetings` : 'Google: Connected')
                : googleAuth.status === AUTH_STATUS.EXPIRED
                ? 'Google: Expired'
                : 'Google Sync'}
            </span>
            {googleAuth.isMock && (
              <span className="ml-1 text-[9px] font-mono text-cyan-400 bg-cyan-400/10 px-1 py-0.2 rounded">Demo</span>
            )}
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-bg-card border border-border-dark rounded-lg px-3 py-1.5 text-xs font-semibold text-text-primary focus:outline-none focus:border-brand-primary cursor-pointer"
          />
        </div>
      </div>

      {/* Top Workflow Navigation Tabs (Phase 6: Includes AI Assistant Chat) */}
      <div className="flex border-b border-border-dark gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('big5')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
            activeTab === 'big5'
              ? 'border-brand-primary text-brand-primary bg-brand-primary/10'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-card'
          }`}
        >
          <Target className="h-4 w-4 mr-2 text-brand-primary" />
          Today&apos;s Big 5
        </button>

        <button
          onClick={() => setActiveTab('morning')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
            activeTab === 'morning'
              ? 'border-amber-400 text-amber-400 bg-amber-400/10'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-card'
          }`}
        >
          <Sun className="h-4 w-4 mr-2 text-amber-400" />
          Morning Planning
        </button>

        <button
          onClick={() => setActiveTab('evening')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
            activeTab === 'evening'
              ? 'border-indigo-400 text-indigo-400 bg-indigo-400/10'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-card'
          }`}
        >
          <Moon className="h-4 w-4 mr-2 text-indigo-400" />
          Evening Check-in
        </button>

        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
            activeTab === 'weekly'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-card'
          }`}
        >
          <BarChart3 className="h-4 w-4 mr-2 text-cyan-400" />
          Weekly Review
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
            activeTab === 'chat'
              ? 'border-purple-400 text-purple-400 bg-purple-400/10'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-card'
          }`}
        >
          <Bot className="h-4 w-4 mr-2 text-purple-400" />
          AI Assistant Chat
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TODAY'S BIG 5 (PHASE 3 CORE VIEW)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'big5' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-card border border-border-dark rounded-xl p-4">
            <div>
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider block">
                Active Execution Mode
              </span>
              <span className="text-xs text-text-secondary">
                {DAY_TYPES[dayType]?.description}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="flex items-center px-3 py-1.5 bg-bg-input hover:bg-bg-card border border-border-dark text-text-primary text-xs font-semibold rounded-lg transition-colors"
                title="Recalculate priorities deterministically"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Regenerate
              </button>

              <button
                onClick={handleSavePlan}
                disabled={saving}
                className="flex items-center px-4 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-brand-primary/20"
              >
                <Save className={`h-3.5 w-3.5 mr-1.5 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>

          {/* Quick AI Planning Advice Bar */}
          <div className="bg-bg-card border border-border-dark rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center">
                <Lightbulb className="h-4 w-4 mr-1.5 text-amber-400" />
                AI Planning Assistance
              </span>
              {isAdviceLoading && (
                <span className="text-[10px] text-text-secondary animate-pulse font-mono">Evaluating plan context...</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAskAdvice('What should I focus on first today?')}
                disabled={isAdviceLoading}
                className="text-2xs bg-bg-input hover:bg-bg-card border border-border-dark text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg transition-colors"
              >
                💡 What to focus on first?
              </button>
              <button
                onClick={() => handleAskAdvice('Can I realistically complete this plan in my available time?')}
                disabled={isAdviceLoading}
                className="text-2xs bg-bg-input hover:bg-bg-card border border-border-dark text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg transition-colors"
              >
                ⏱️ Is this workload realistic?
              </button>
              <button
                onClick={() => handleAskAdvice('Which task should I defer if a meeting overruns?')}
                disabled={isAdviceLoading}
                className="text-2xs bg-bg-input hover:bg-bg-card border border-border-dark text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg transition-colors"
              >
                ⚠️ What should I defer if busy?
              </button>
            </div>

            {aiPlanningAdvice && (
              <div className="p-3 bg-brand-primary/10 border border-brand-primary/30 rounded-lg text-xs space-y-1 mt-2">
                <p className="font-bold text-brand-primary">{aiPlanningAdvice.recommendation}</p>
                {aiPlanningAdvice.capacityAnalysis && (
                  <p className="text-text-secondary text-[11px]">{aiPlanningAdvice.capacityAnalysis}</p>
                )}
                {aiPlanningAdvice.recommendedDeferrals?.length > 0 && (
                  <p className="text-amber-300 text-[11px]">Suggestion: {aiPlanningAdvice.recommendedDeferrals.join(', ')}</p>
                )}
              </div>
            )}
          </div>

          {/* Day Type Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {Object.entries(DAY_TYPES).map(([key, config]) => {
              const isSelected = dayType === key;
              return (
                <button
                  key={key}
                  onClick={() => handleDayTypeChange(key)}
                  className={`px-3 py-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-brand-primary/20 border-brand-primary text-text-primary shadow-sm'
                      : 'bg-bg-input border-border-dark text-text-secondary hover:text-text-primary hover:border-brand-primary/30'
                  }`}
                >
                  <p className="text-xs font-bold truncate">{config.label}</p>
                  <p className="text-[10px] text-text-secondary mt-0.5 font-mono">
                    {Math.round(config.capacityFactor * 100)}% Capacity
                  </p>
                </button>
              );
            })}
          </div>

          {/* Available Time & Feasibility Gauge Card */}
          <div className="bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-brand-primary" />
                  Schedule Feasibility & Work Capacity
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Available work time excludes protected health routines (05:45–07:45 AM), meals, and sleep.
                  {calendarBusyMinutes > 0 && (
                    <span className="text-brand-primary ml-1 font-bold">
                      Deducted {calendarBusyMinutes}m for Google Calendar commitments.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono font-bold">
                <div>
                  <span className="text-text-secondary">Planned:</span>{' '}
                  <span className="text-brand-primary">{acceptedMinutes}m</span> ({((acceptedMinutes / 60)).toFixed(1)}h)
                </div>
                {calendarBusyMinutes > 0 && (
                  <div>
                    <span className="text-text-secondary">Meetings:</span>{' '}
                    <span className="text-cyan-400">{calendarBusyMinutes}m</span>
                  </div>
                )}
                <div>
                  <span className="text-text-secondary">Available:</span>{' '}
                  <span className="text-text-primary">{availableMinutes}m</span> ({((availableMinutes / 60)).toFixed(1)}h)
                </div>
                <div>
                  <span className="text-text-secondary">Utilization:</span>{' '}
                  <span className={utilizationPercent > 100 ? 'text-red-400' : 'text-emerald-400'}>
                    {utilizationPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Capacity Bar */}
            <div className="w-full bg-bg-input rounded-full h-3 border border-border-dark overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  utilizationPercent > 100 
                    ? 'bg-red-500' 
                    : utilizationPercent > 80 
                    ? 'bg-amber-500' 
                    : 'bg-brand-primary'
                }`}
                style={{ width: `${Math.min(100, utilizationPercent)}%` }}
              />
            </div>
          </div>

          {/* Blocked High-Priority Tasks Alert */}
          {blockedAlerts.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                    High-Priority Tasks Blocked ({blockedAlerts.length})
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    These tasks scored high in priority but are blocked by dependencies and cannot be scheduled for execution today:
                  </p>
                  <div className="mt-2.5 space-y-1.5">
                    {blockedAlerts.map(b => (
                      <div key={b.taskId} className="text-xs text-rose-200 bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 rounded-lg flex items-center justify-between">
                        <span className="font-semibold">{b.title}</span>
                        <span className="text-[10px] font-mono text-rose-400">Score: {b.priorityScore}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top 5 Recommended Priorities List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary flex items-center">
                <Target className="h-4 w-4 mr-2 text-brand-primary" />
                Recommended Focus Tasks (#{recommendedTasks.length})
              </h3>
              <span className="text-xs text-text-secondary">
                {overallSummary}
              </span>
            </div>

            {recommendedTasks.length === 0 ? (
              <div className="bg-bg-card border border-border-dark rounded-xl p-8 text-center text-text-secondary">
                <p className="text-sm font-semibold">No candidate tasks available.</p>
                <p className="text-xs mt-1">Create tasks in the Tasks tab or import from Google Tasks to generate daily recommendations.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recommendedTasks.map((task, index) => {
                  const isAccepted = task.isAccepted !== false;
                  return (
                    <div 
                      key={task.taskId} 
                      className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                        isAccepted 
                          ? 'bg-bg-card border-border-dark hover:border-brand-primary/40' 
                          : 'bg-bg-card/40 border-border-dark/40 opacity-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                        {/* Number Badge */}
                        <div className="flex flex-col items-center justify-center h-8 w-8 rounded-lg bg-bg-input border border-border-dark font-black text-xs text-brand-primary shrink-0">
                          #{index + 1}
                        </div>

                        {/* Title and details */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-text-primary truncate">
                              {task.title}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(task.priorityScore)}`}>
                              Score: {task.priorityScore}
                            </span>
                            {task.category && (
                              <span className="text-[10px] font-semibold text-text-secondary bg-bg-input px-2 py-0.5 rounded border border-border-dark uppercase">
                                {task.category}
                              </span>
                            )}
                            {task.source === 'GoogleTasks' && (
                              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/30">
                                Google Task
                              </span>
                            )}
                            {task.isManualOverride && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30 flex items-center">
                                <Flame className="h-3 w-3 mr-1" /> Override
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary truncate">
                            {task.selectionRationale || task.description || 'Prioritized for today.'}
                          </p>
                        </div>
                      </div>

                      {/* Controls: Duration, Breakdown, Explain, Toggle */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {/* Duration Input */}
                        <div className="flex items-center bg-bg-input border border-border-dark rounded-lg px-2 py-1 text-xs">
                          <Clock className="h-3 w-3 mr-1 text-text-secondary" />
                          <input
                            type="number"
                            min="15"
                            max="480"
                            step="15"
                            value={task.duration || 45}
                            onChange={(e) => handleDurationChange(task.taskId, e.target.value)}
                            className="w-10 bg-transparent text-right font-mono font-bold text-text-primary focus:outline-none"
                          />
                          <span className="text-text-secondary ml-1 font-mono text-[10px]">m</span>
                        </div>

                        {/* Move Up/Down */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMoveTask(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded bg-bg-input hover:bg-bg-card border border-border-dark text-text-secondary disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={() => handleMoveTask(index, 'down')}
                            disabled={index === recommendedTasks.length - 1}
                            className="p-1 rounded bg-bg-input hover:bg-bg-card border border-border-dark text-text-secondary disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        {/* AI Breakdown Trigger (Phase 6) */}
                        <button
                          onClick={() => handleRequestBreakdown(task)}
                          className="px-2 py-1 text-xs font-semibold text-brand-primary hover:text-white bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 rounded-lg transition-colors flex items-center"
                          title="Break down into actionable subtasks"
                        >
                          <Wand2 className="h-3 w-3 mr-1" />
                          Breakdown
                        </button>

                        {/* Factor Breakdown Modal Trigger */}
                        <button
                          onClick={() => setExplainingTask(task)}
                          className="px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary bg-bg-input hover:bg-bg-card border border-border-dark rounded-lg transition-colors"
                          title="View 5-factor scoring breakdown"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>

                        {/* Defer Button */}
                        <button
                          onClick={() => handleOpenDeferral(task)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
                          title="Defer task from today's plan"
                        >
                          Defer
                        </button>

                        {/* Acceptance Toggle */}
                        <button
                          onClick={() => handleToggleAcceptance(task.taskId)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isAccepted
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                              : 'bg-bg-input border-border-dark text-text-secondary'
                          }`}
                          title={isAccepted ? 'Task Accepted' : 'Task Excluded'}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deferred / Overflow Tasks Section */}
          {overflowTasks.length > 0 && (
            <div className="bg-bg-card border border-border-dark rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center">
                <PauseCircle className="h-4 w-4 mr-2 text-amber-400" />
                Deferred & Overflow Tasks ({overflowTasks.length})
              </h4>
              <p className="text-xs text-text-secondary">
                These tasks were deferred due to daily capacity limits or manual deferral.
              </p>
              <div className="space-y-2">
                {overflowTasks.map(t => (
                  <div key={t.taskId} className="p-3 bg-bg-input border border-border-dark rounded-lg flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary">{t.title}</span>
                    <span className="text-[10px] text-amber-400 font-mono">{t.deferralReason || 'Capacity constraint'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MORNING PLANNING WORKFLOW                                         */}
      {/* ========================================================================= */}
      {activeTab === 'morning' && (
        <div className="space-y-6">
          {/* Morning Banner & Notice */}
          <div className="bg-gradient-to-r from-amber-500/10 to-brand-primary/10 border border-amber-500/30 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Sun className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  Morning Alignment & Commitment Confirmation
                </h3>
                <p className="text-xs text-text-secondary">
                  Review your day&apos;s protected routine, verify scheduled commitments, and confirm today&apos;s focus tasks.
                </p>
                <div className="pt-1 flex items-center gap-2 text-[10px] font-mono">
                  {googleAuth.status === AUTH_STATUS.CONNECTED ? (
                    <span className="text-emerald-400 flex items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Google Calendar synchronized ({calendarBusyMinutes}m meetings deducted).
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                      Commitments based on local daily routine SOP (Google Calendar offline).
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Existing Plan Notice */}
          {savedPlan && (
            <div className="bg-bg-card border border-border-dark rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-text-primary">
                  An active daily plan is already recorded for <span className="font-bold text-white">{selectedDate}</span> ({savedPlan.plannedMinutes}m planned).
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegenerate}
                  className="px-3 py-1 bg-bg-input hover:bg-bg-dark border border-border-dark text-xs text-text-primary font-semibold rounded-lg transition-colors"
                >
                  Regenerate Freshly
                </button>
              </div>
            </div>
          )}

          {/* Grid: Protected Routine vs Today's Planned Focus */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Protected Routine Blocks & Calendar Events */}
            <div className="lg:col-span-5 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-brand-primary" />
                  Protected Routine Blocks ({routineTemplateKey})
                </h4>
                <span className="text-[10px] font-mono text-text-secondary bg-bg-input px-2 py-0.5 rounded border border-border-dark">
                  {routineBlocks.length} slots
                </span>
              </div>

              {/* Show Google Calendar Events if present */}
              {calendarEvents.length > 0 && (
                <div className="p-3 bg-brand-primary/10 border border-brand-primary/30 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-brand-primary">
                    <span className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      Google Calendar Meetings ({calendarEvents.length})
                    </span>
                    <span>{calendarBusyMinutes}m busy</span>
                  </div>
                  <div className="space-y-1">
                    {calendarEvents.map(evt => (
                      <div key={evt.id} className="text-xs text-text-primary bg-bg-card/70 border border-border-dark/60 p-2 rounded-lg flex justify-between">
                        <span className="truncate font-semibold">{evt.summary || evt.title}</span>
                        <span className="text-[10px] font-mono text-text-secondary shrink-0">
                          {evt.start?.dateTime ? evt.start.dateTime.split('T')[1].substring(0, 5) : 'All-day'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {routineBlocks.map(block => (
                  <div key={block.id} className="p-2.5 bg-bg-input border border-border-dark rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-text-primary">{block.activity}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">{block.time}</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-brand-primary shrink-0">
                      {block.duration}h
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Today's Big 5 Confirmation & Intentions */}
            <div className="lg:col-span-7 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center">
                  <Target className="h-4 w-4 mr-2 text-amber-400" />
                  Today&apos;s Focus Actions ({acceptedTasks.length} tasks)
                </span>
                <span className="text-xs font-mono text-brand-primary">
                  {acceptedMinutes}m / {availableMinutes}m
                </span>
              </h4>

              <div className="space-y-2">
                {acceptedTasks.map((t, idx) => (
                  <div key={t.taskId} className="p-3 bg-bg-input border border-border-dark rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="font-mono text-text-secondary font-bold">#{idx + 1}</span>
                      <span className="font-semibold text-text-primary truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">
                      {t.duration || 45}m
                    </span>
                  </div>
                ))}
              </div>

              {/* Morning Focus & Strategy Reflection */}
              <div className="space-y-2 pt-2 border-t border-border-dark">
                <label className="text-xs font-bold text-text-secondary block">
                  Morning Focus & Execution Strategy Notes (Optional)
                </label>
                <textarea
                  rows="3"
                  value={morningNotes}
                  onChange={(e) => setMorningNotes(e.target.value)}
                  placeholder="What is the single most important breakthrough needed today? Any risks or dependencies to monitor?"
                  className="w-full bg-bg-input border border-border-dark rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Save / Confirm Morning Review */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveMorningReview}
                  disabled={saving}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg transition-colors flex items-center shadow-lg shadow-amber-500/20"
                >
                  <Save className={`h-3.5 w-3.5 mr-1.5 ${saving ? 'animate-spin' : ''}`} />
                  {saving ? 'Locking Plan...' : 'Confirm & Lock Morning Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EVENING REVIEW WORKFLOW                                           */}
      {/* ========================================================================= */}
      {activeTab === 'evening' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-500/10 to-brand-primary/10 border border-indigo-500/30 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Moon className="h-6 w-6 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">
                  Evening Check-In & Momentum Reflection
                </h3>
                <p className="text-xs text-text-secondary">
                  Reconcile today&apos;s planned work, record deferral reasons constructively without penalties, and celebrate progress.
                </p>
              </div>
            </div>
          </div>

          {/* Tasks Reconciled List */}
          <div className="bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center justify-between">
              <span>Today&apos;s Planned Tasks Reconciliation</span>
              <span className="text-xs font-mono text-indigo-400">
                {recommendedTasks.filter(t => t.status === 'Completed').length} / {recommendedTasks.length} Completed
              </span>
            </h4>

            <div className="space-y-3">
              {recommendedTasks.map(t => {
                const isDone = t.status === 'Completed';
                return (
                  <div 
                    key={t.taskId} 
                    className={`p-3.5 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDone 
                        ? 'bg-emerald-500/5 border-emerald-500/30' 
                        : 'bg-bg-input border-border-dark'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <button
                        onClick={() => toggleTaskComplete(t.taskId)}
                        className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                          isDone 
                            ? 'bg-emerald-500 text-black border-emerald-500' 
                            : 'border-text-secondary/40 text-transparent hover:border-text-secondary'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>

                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isDone ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                          {t.title}
                        </p>
                        <p className="text-[10px] text-text-secondary mt-0.5 font-mono">
                          Planned: {t.duration || 45}m • Score: {t.priorityScore}
                        </p>
                      </div>
                    </div>

                    {/* If Incomplete, Structured Deferral Reason Selector */}
                    {!isDone && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-text-secondary">Reason:</span>
                        <select
                          value={taskDeferralMap[t.taskId] || 'Insufficient time'}
                          onChange={(e) => setTaskDeferralMap(prev => ({ ...prev, [t.taskId]: e.target.value }))}
                          className="bg-bg-card border border-border-dark rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                        >
                          {DEFERRAL_REASONS.map(reason => (
                            <option key={reason} value={reason}>{reason}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evening Reflection & Tomorrow's Suggestions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Reflection Textarea */}
            <div className="lg:col-span-7 bg-bg-card border border-border-dark rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center">
                <FileText className="h-4 w-4 mr-2 text-indigo-400" />
                Evening Reflection & Learnings
              </h4>
              <p className="text-xs text-text-secondary">
                What went well today? What caused delays, and what can be calibrated tomorrow?
              </p>
              <textarea
                rows="4"
                value={eveningReflection}
                onChange={(e) => setEveningReflection(e.target.value)}
                placeholder="Log your wins, surprises, or time estimate reflections here..."
                className="w-full bg-bg-input border border-border-dark rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-text-secondary flex items-center">
                  <ShieldCheck className="h-3 w-3 mr-1 text-emerald-400" />
                  No XP or streak penalties for incomplete tasks.
                </span>

                <button
                  onClick={handleSaveEveningReview}
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center shadow-lg shadow-indigo-500/20"
                >
                  <Save className={`h-3.5 w-3.5 mr-1.5 ${saving ? 'animate-spin' : ''}`} />
                  {saving ? 'Saving...' : 'Save Evening Review'}
                </button>
              </div>
            </div>

            {/* Tomorrow's Candidate Preview */}
            <div className="lg:col-span-5 bg-bg-card border border-border-dark rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-amber-400" />
                Suggested Priorities for Tomorrow
              </h4>
              <p className="text-xs text-text-secondary">
                Top candidates queued by priority engine for tomorrow morning:
              </p>
              <div className="space-y-2">
                {tomorrowPriorities.map((t) => (
                  <div key={t.taskId} className="p-3 bg-bg-input border border-border-dark rounded-lg flex items-center justify-between text-xs">
                    <div className="truncate">
                      <p className="font-semibold text-text-primary truncate">{t.title}</p>
                      <p className="text-[10px] text-text-secondary">{t.category}</p>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold shrink-0">
                      Score: {t.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WEEKLY REVIEW WORKFLOW                                            */}
      {/* ========================================================================= */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          {/* Week Selector Bar */}
          <div className="bg-bg-card border border-border-dark rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
              <div>
                <span className="text-xs font-bold text-text-primary block">
                  Weekly Review Period: {selectedWeekKey}
                </span>
                <span className="text-[10px] font-mono text-text-secondary">
                  {weekStartDate} to {weekEndDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="p-1.5 bg-bg-input hover:bg-bg-dark border border-border-dark text-text-primary rounded-lg text-xs"
                title="Previous Week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-mono font-bold px-2 py-1 bg-bg-input rounded border border-border-dark">
                {selectedWeekKey}
              </span>
              <button
                onClick={handleNextWeek}
                className="p-1.5 bg-bg-input hover:bg-bg-dark border border-border-dark text-text-primary rounded-lg text-xs"
                title="Next Week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center px-3 py-1.5 bg-bg-input hover:bg-bg-dark border border-border-dark text-cyan-400 text-xs font-semibold rounded-lg ml-2"
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                Past Reviews ({allWeeklyReviews.length})
              </button>
            </div>
          </div>

          {/* High Level KPI Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-bg-card border border-border-dark rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                Completion Rate
              </span>
              <p className="text-2xl font-black text-cyan-400 font-mono">
                {weeklyMetrics.completionRate}%
              </p>
              <p className="text-[10px] text-text-secondary font-mono">
                {weeklyMetrics.tasksCompletedCount} of {weeklyMetrics.tasksPlannedCount} planned tasks
              </p>
            </div>

            <div className="bg-bg-card border border-border-dark rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                Overdue Tasks
              </span>
              <p className={`text-2xl font-black font-mono ${weeklyMetrics.overdueCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {weeklyMetrics.overdueCount}
              </p>
              <p className="text-[10px] text-text-secondary">
                Active tasks past due date
              </p>
            </div>

            <div className="bg-bg-card border border-border-dark rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                Time Estimation
              </span>
              <p className="text-xs font-mono font-bold text-text-primary mt-1">
                {weeklyMetrics.hasActualDurationData ? (
                  <>
                    <span>Est: {(weeklyMetrics.estimatedMinutesTotal / 60).toFixed(1)}h</span> •{' '}
                    <span>Act: {(weeklyMetrics.actualMinutesTotal / 60).toFixed(1)}h</span>
                  </>
                ) : (
                  <span className="text-text-secondary">No actual time logged</span>
                )}
              </p>
              <p className="text-[10px] text-text-secondary">
                {weeklyMetrics.estimationVariancePercent !== null
                  ? `${weeklyMetrics.estimationVariancePercent > 0 ? '+' : ''}${weeklyMetrics.estimationVariancePercent}% variance`
                  : 'Duration estimates only'}
              </p>
            </div>

            <div className="bg-bg-card border border-border-dark rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                Deferred Tasks
              </span>
              <p className="text-2xl font-black text-amber-400 font-mono">
                {weeklyMetrics.deferredCount}
              </p>
              <p className="text-[10px] text-text-secondary">
                Recorded across daily plans
              </p>
            </div>
          </div>

          {/* AI Review Insights Card (Phase 6) */}
          <div className="bg-bg-card border border-border-dark rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-cyan-400" />
                AI Executive Review Synthesis
              </h4>
              <button
                onClick={handleGenerateReviewInsights}
                disabled={isInsightsLoading}
                className="flex items-center px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold rounded-lg transition-colors"
              >
                <RefreshCw className={`h-3 w-3 mr-1.5 ${isInsightsLoading ? 'animate-spin' : ''}`} />
                {isInsightsLoading ? 'Synthesizing...' : 'Generate AI Synthesis'}
              </button>
            </div>

            {aiReviewInsights && (
              <div className="p-4 bg-bg-input border border-border-dark rounded-xl space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Observed Trends:</span>
                  <ul className="list-disc list-inside space-y-0.5 mt-1 text-text-primary">
                    {aiReviewInsights.observedTrends.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>

                {aiReviewInsights.estimationLessons && (
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Estimation Lessons:</span>
                    <p className="text-text-primary mt-0.5">{aiReviewInsights.estimationLessons}</p>
                  </div>
                )}

                {aiReviewInsights.strategicRecommendations?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Strategic Recommendations:</span>
                    <ul className="list-disc list-inside space-y-0.5 mt-1 text-cyan-200">
                      {aiReviewInsights.strategicRecommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Workload by Category & Revenue Outcomes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Category Workload Distribution */}
            <div className="lg:col-span-6 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center">
                <Layers className="h-4 w-4 mr-2 text-cyan-400" />
                Workload by Project Area / Category
              </h4>

              {Object.keys(weeklyMetrics.categoryWorkload).length === 0 ? (
                <p className="text-xs text-text-secondary">No planned tasks recorded in this period.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(weeklyMetrics.categoryWorkload).map(([cat, info]) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-text-primary">{cat}</span>
                        <span className="text-text-secondary font-mono">{info.completed}/{info.count} done ({((info.minutes / 60)).toFixed(1)}h)</span>
                      </div>
                      <div className="w-full bg-bg-input rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${info.count > 0 ? Math.round((info.completed / info.count) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Blockers & Deferral Reasons */}
            <div className="lg:col-span-6 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-rose-400" />
                Blockers & Deferral Trends
              </h4>

              {weeklyMetrics.currentBlockers.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-rose-400 uppercase">Current Blockers:</span>
                  {weeklyMetrics.currentBlockers.map(b => (
                    <div key={b.taskId} className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg flex justify-between">
                      <span className="font-semibold truncate">{b.title}</span>
                      <span className="font-mono text-[10px] text-rose-400 shrink-0">{b.category}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-400 flex items-center">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> No active blockers this week.
                </p>
              )}

              {Object.keys(weeklyMetrics.deferralReasonsSummary).length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border-dark">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Frequent Deferral Reasons:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(weeklyMetrics.deferralReasonsSummary).map(([reason, count]) => (
                      <div key={reason} className="p-2 bg-bg-input border border-border-dark rounded-lg text-xs flex justify-between">
                        <span className="text-text-secondary truncate">{reason}</span>
                        <span className="font-mono font-bold text-amber-400">{count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Suggested Priorities for Next Week */}
          <div className="bg-bg-card border border-border-dark rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-cyan-400" />
              Suggested Priorities for Next Week (Top Backlog Candidates)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {weeklyMetrics.suggestedNextWeekPriorities.map((t, idx) => (
                <div key={t.taskId} className="p-3 bg-bg-input border border-border-dark rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">#{idx + 1}</span>
                    <span className="text-[10px] font-bold text-text-secondary bg-bg-card px-1.5 py-0.5 rounded border border-border-dark uppercase">{t.category}</span>
                  </div>
                  <p className="text-xs font-bold text-text-primary truncate">{t.title}</p>
                  <p className="text-[10px] text-text-secondary truncate">{t.prioritySummary || 'High priority score'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Reflection Textarea & Commit */}
          <div className="bg-bg-card border border-border-dark rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center">
              <FileText className="h-4 w-4 mr-2 text-cyan-400" />
              Weekly Synthesis & Strategic Adjustments
            </h4>
            <p className="text-xs text-text-secondary">
              What strategic lessons emerged this week? What changes should be made to routine or project focus?
            </p>
            <textarea
              rows="4"
              value={weeklyReflection}
              onChange={(e) => setWeeklyReflection(e.target.value)}
              placeholder="Record weekly achievements, financial progress, and adjustments for the upcoming week..."
              className="w-full bg-bg-input border border-border-dark rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
            />

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveWeeklyReview}
                disabled={saving}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-bold rounded-lg transition-colors flex items-center shadow-lg shadow-cyan-500/20"
              >
                <Save className={`h-3.5 w-3.5 mr-1.5 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Saving...' : 'Save Weekly Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AI ASSISTANT CHAT CONVERSATION (PHASE 6)                          */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="bg-bg-card border border-border-dark rounded-2xl flex flex-col h-[650px] shadow-xl overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-border-dark flex items-center justify-between bg-bg-dark/40">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Personal AI Productivity Partner</h3>
                <p className="text-[10px] text-text-secondary flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  <span>Grounded in your actual Big 5, Backlog, Routines, and Calendar.</span>
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/30">
              Antigravity Assistant
            </span>
          </div>

          {/* Quick Starter Pills */}
          <div className="p-3 border-b border-border-dark bg-bg-input/30 flex flex-wrap gap-2">
            <button
              onClick={() => handleSendChatMessage('What should I focus on first today?')}
              className="text-2xs bg-bg-card hover:bg-bg-input border border-border-dark text-text-secondary hover:text-text-primary px-3 py-1 rounded-full transition-colors"
            >
              🎯 What should I focus on today?
            </button>
            <button
              onClick={() => handleSendChatMessage('Why are these tasks my top Big 5?')}
              className="text-2xs bg-bg-card hover:bg-bg-input border border-border-dark text-text-secondary hover:text-text-primary px-3 py-1 rounded-full transition-colors"
            >
              ⚖️ Why are these my Big 5?
            </button>
            <button
              onClick={() => handleSendChatMessage('What should I defer if a meeting overruns?')}
              className="text-2xs bg-bg-card hover:bg-bg-input border border-border-dark text-text-secondary hover:text-text-primary px-3 py-1 rounded-full transition-colors"
            >
              ⏱️ What should I defer if schedule is full?
            </button>
          </div>

          {/* Chat Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 text-xs space-y-2 leading-relaxed ${
                      isUser
                        ? 'bg-brand-primary text-white rounded-br-none shadow-md shadow-brand-primary/20'
                        : 'bg-bg-input border border-border-dark text-text-primary rounded-bl-none'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between text-[10px] text-text-secondary font-mono border-b border-border-dark/60 pb-1">
                        <span className="flex items-center font-bold text-purple-400">
                          <Bot className="h-3 w-3 mr-1" /> Antigravity AI
                        </span>
                        <span>{msg.isAi ? 'Gemini 2.5 Flash' : 'Deterministic Heuristic'}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              );
            })}

            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-bg-input border border-border-dark rounded-2xl rounded-bl-none p-3 text-xs text-text-secondary flex items-center space-x-2 animate-pulse">
                  <Bot className="h-4 w-4 text-purple-400 animate-spin" />
                  <span>Synthesizing authorized productivity data...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-border-dark bg-bg-dark/50 flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
              placeholder="Ask about your tasks, priorities, capacity, or goals..."
              className="flex-1 bg-bg-input border border-border-dark rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
            />
            <button
              onClick={() => handleSendChatMessage()}
              disabled={!chatInput.trim() || isChatLoading}
              className="p-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors disabled:opacity-40"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TASK BREAKDOWN MODAL (PHASE 6)                                            */}
      {/* ========================================================================= */}
      {showBreakdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-bg-card border border-border-dark rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border-dark pb-3">
              <div className="flex items-center space-x-2.5">
                <Wand2 className="h-5 w-5 text-brand-primary" />
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    AI Task Breakdown: {breakingDownTask?.title}
                  </h3>
                  <span className="text-[10px] text-text-secondary">
                    Decomposed into actionable physical subtasks with time estimates.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isBreakdownLoading ? (
              <div className="py-12 text-center text-xs text-text-secondary space-y-2">
                <Wand2 className="h-6 w-6 text-brand-primary mx-auto animate-spin" />
                <p>Generating concrete action steps...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {breakdownReasoning && (
                  <p className="text-xs text-text-secondary italic bg-bg-input p-2.5 rounded-lg border border-border-dark">
                    💡 {breakdownReasoning}
                  </p>
                )}

                <div className="space-y-2">
                  {subtaskBreakdown.map((sub, idx) => {
                    const isChecked = selectedSubtaskIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        className={`p-3 border rounded-xl flex items-start space-x-3 text-xs transition-colors ${
                          isChecked
                            ? 'bg-brand-primary/10 border-brand-primary'
                            : 'bg-bg-input border-border-dark opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedSubtaskIndices(prev =>
                              prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                            );
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-border-dark text-brand-primary focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-text-primary">{sub.title}</span>
                            <span className="font-mono text-[10px] font-bold text-brand-primary shrink-0 ml-2">
                              {sub.estimatedDuration}m
                            </span>
                          </div>
                          {sub.description && (
                            <p className="text-[11px] text-text-secondary">{sub.description}</p>
                          )}
                          {sub.nextAction && (
                            <p className="text-[10px] text-amber-300 font-mono">Next: {sub.nextAction}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-border-dark">
              <span className="text-[10px] font-mono text-text-secondary">
                {breakdownIsAi ? '⚡ Powered by Gemini 2.5 Flash' : '⚡ Deterministic Decomposition Heuristics'}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBreakdownModal(false)}
                  className="px-4 py-2 bg-bg-input hover:bg-bg-card border border-border-dark text-text-secondary rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubtasksToBacklog}
                  disabled={selectedSubtaskIndices.length === 0 || isBreakdownLoading}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                >
                  Add Selected ({selectedSubtaskIndices.length}) to Backlog
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GOOGLE INTEGRATION DRAWER / MODAL (PHASE 5)                               */}
      {/* ========================================================================= */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-bg-card border border-border-dark rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border-dark pb-3">
              <div className="flex items-center space-x-2.5">
                <Calendar className="h-5 w-5 text-brand-primary" />
                <h3 className="text-base font-bold text-text-primary">
                  Google Calendar & Google Tasks Integration
                </h3>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Connection Banner */}
            <div className="p-4 bg-bg-input border border-border-dark rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${googleAuth.status === AUTH_STATUS.CONNECTED ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="text-xs font-bold text-text-primary">
                    Status: {googleAuth.status}
                  </span>
                  {googleAuth.isMock && (
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/30">
                      Demo / Local Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">
                  {googleAuth.status === AUTH_STATUS.CONNECTED 
                    ? `Connected as ${googleAuth.userEmail || 'Google User'}`
                    : 'Connect your Google account to sync meetings and import Google Tasks.'}
                </p>
              </div>

              <div>
                {googleAuth.status === AUTH_STATUS.CONNECTED ? (
                  <button
                    onClick={handleDisconnectGoogle}
                    className="flex items-center px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-lg transition-colors"
                  >
                    <Unlink className="h-3.5 w-3.5 mr-1.5" />
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleConnectGoogle}
                    className="flex items-center px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-brand-primary/20"
                  >
                    <Link2 className="h-3.5 w-3.5 mr-1.5" />
                    Connect Google Account
                  </button>
                )}
              </div>
            </div>

            {/* Google Sub-Tabs: Calendar vs Tasks */}
            {googleAuth.status === AUTH_STATUS.CONNECTED && (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="flex border-b border-border-dark gap-3 text-xs font-bold">
                  <button
                    onClick={() => setGoogleModalTab('calendar')}
                    className={`pb-2 border-b-2 transition-colors ${
                      googleModalTab === 'calendar'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Today&apos;s Calendar Events ({calendarEvents.length})
                  </button>
                  <button
                    onClick={() => {
                      setGoogleModalTab('tasks');
                      loadGoogleTasks(selectedTaskListId);
                    }}
                    className={`pb-2 border-b-2 transition-colors ${
                      googleModalTab === 'tasks'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Import Google Tasks
                  </button>
                </div>

                {/* TAB A: Calendar Events */}
                {googleModalTab === 'calendar' && (
                  <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                    <div className="flex justify-between items-center text-xs text-text-secondary">
                      <span>Date: <span className="font-bold text-text-primary">{selectedDate}</span></span>
                      <span>Total Busy Time: <span className="font-bold text-brand-primary">{calendarBusyMinutes}m</span></span>
                    </div>

                    {calendarEvents.length === 0 ? (
                      <div className="text-center py-8 text-text-secondary text-xs">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                        <p className="font-semibold text-text-primary">No meetings scheduled for this day.</p>
                        <p className="text-[11px] mt-1">Full discretionary work capacity is available for task execution.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {calendarEvents.map(evt => (
                          <div key={evt.id} className="p-3 bg-bg-input border border-border-dark rounded-xl flex items-center justify-between text-xs">
                            <div className="min-w-0 flex-1 pr-3">
                              <p className="font-bold text-text-primary truncate">{evt.summary || evt.title || 'Untitled Meeting'}</p>
                              <p className="text-[10px] text-text-secondary mt-0.5 font-mono">
                                {evt.start?.dateTime ? `${evt.start.dateTime.split('T')[1].substring(0, 5)} - ${evt.end?.dateTime?.split('T')[1]?.substring(0, 5) || ''}` : 'All-Day'}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                              Confirmed
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB B: Google Tasks Import */}
                {googleModalTab === 'tasks' && (
                  <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">Task List:</span>
                        <select
                          value={selectedTaskListId}
                          onChange={(e) => {
                            setSelectedTaskListId(e.target.value);
                            loadGoogleTasks(e.target.value);
                          }}
                          className="bg-bg-input border border-border-dark rounded-lg px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                        >
                          {googleTaskLists.map(list => (
                            <option key={list.id} value={list.id}>{list.title}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleImportSelectedTasks}
                        disabled={selectedImportIds.length === 0 || isImporting}
                        className="px-4 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40 flex items-center"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Import Selected ({selectedImportIds.length})
                      </button>
                    </div>

                    {isTasksLoading ? (
                      <p className="text-xs text-center py-8 text-text-secondary">Loading tasks from Google Tasks...</p>
                    ) : googleTasksList.length === 0 ? (
                      <p className="text-xs text-center py-8 text-text-secondary">No active tasks in this list.</p>
                    ) : (
                      <div className="space-y-2">
                        {googleTasksList.map(gtask => {
                          const alreadyImported = googleTasksService.isAlreadyImported(gtask.id, tasks);
                          const isSelected = selectedImportIds.includes(gtask.id);

                          return (
                            <div 
                              key={gtask.id} 
                              className={`p-3 border rounded-xl flex items-center justify-between gap-3 text-xs transition-colors ${
                                alreadyImported 
                                  ? 'bg-bg-input/40 border-border-dark/40 opacity-60' 
                                  : isSelected 
                                  ? 'bg-brand-primary/10 border-brand-primary' 
                                  : 'bg-bg-input border-border-dark'
                              }`}
                            >
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                {!alreadyImported ? (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleTaskSelection(gtask.id)}
                                    className="h-4 w-4 rounded border-border-dark text-brand-primary focus:ring-0 cursor-pointer"
                                  />
                                ) : (
                                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                )}

                                <div className="min-w-0">
                                  <p className="font-bold text-text-primary truncate">{gtask.title}</p>
                                  {gtask.notes && (
                                    <p className="text-[10px] text-text-secondary truncate mt-0.5">{gtask.notes}</p>
                                  )}
                                  {gtask.due && (
                                    <p className="text-[10px] text-amber-400 font-mono mt-0.5">Due: {gtask.due.split('T')[0]}</p>
                                  )}
                                </div>
                              </div>

                              <div>
                                {alreadyImported ? (
                                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                                    In Backlog
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-text-secondary bg-bg-card px-2 py-0.5 rounded border border-border-dark">
                                    Ready to Import
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowGoogleModal(false)}
              className="w-full py-2 bg-bg-input hover:bg-bg-card border border-border-dark rounded-xl text-xs font-bold text-text-primary transition-colors mt-auto"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FACTOR BREAKDOWN MODAL                                                    */}
      {/* ========================================================================= */}
      {explainingTask && explainingTask.scoreBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-bg-card border border-border-dark rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                  Priority Formula Breakdown
                </span>
                <h3 className="text-base font-bold text-text-primary mt-0.5">
                  {explainingTask.title}
                </h3>
              </div>
              <button 
                onClick={() => setExplainingTask(null)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-bg-input rounded-xl border border-border-dark flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Final Priority Score:</span>
              <span className={`text-sm font-black px-2.5 py-0.5 rounded border ${getPriorityBadge(explainingTask.priorityScore)}`}>
                {explainingTask.priorityScore} / 100 ({explainingTask.priorityBand})
              </span>
            </div>

            <div className="space-y-3">
              {Object.entries(explainingTask.scoreBreakdown).map(([factorKey, data]) => {
                const labels = {
                  urgency: 'Deadline Urgency (30%)',
                  goalAlignment: 'Goal Alignment (25%)',
                  incomeImpact: 'Income Impact (20%)',
                  dependency: 'Dependency Importance (15%)',
                  readiness: 'Readiness (10%)'
                };
                return (
                  <div key={factorKey} className="text-xs space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-text-primary">{labels[factorKey] || factorKey}</span>
                      <span className="font-mono text-brand-primary">+{data.weighted} pts</span>
                    </div>
                    <p className="text-text-secondary text-[11px]">{data.reason}</p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setExplainingTask(null)}
              className="w-full py-2 bg-bg-input hover:bg-bg-card border border-border-dark rounded-xl text-xs font-bold text-text-primary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEFERRAL REASON MODAL                                                     */}
      {/* ========================================================================= */}
      {deferringTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-bg-card border border-border-dark rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-text-primary">
              Defer Task: {deferringTask.title}
            </h3>
            <p className="text-xs text-text-secondary">
              Select or provide a reason for moving this task out of today&apos;s focus:
            </p>

            <select
              value={deferReason}
              onChange={(e) => setDeferReason(e.target.value)}
              className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
            >
              {DEFERRAL_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeferringTask(null)}
                className="px-4 py-2 bg-bg-input hover:bg-bg-card border border-border-dark rounded-lg text-xs font-semibold text-text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeferral}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold"
              >
                Confirm Deferral
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HISTORICAL WEEKLY REVIEWS MODAL                                          */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-bg-card border border-border-dark rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary flex items-center">
                <History className="h-4 w-4 mr-2 text-cyan-400" />
                Past Weekly Reviews History
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {allWeeklyReviews.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-8">No saved weekly reviews found.</p>
              ) : (
                allWeeklyReviews.map(rev => (
                  <div key={rev.reviewId} className="p-4 bg-bg-input border border-border-dark rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-cyan-400 font-mono">{rev.periodKey}</span>
                      <span className="text-[10px] text-text-secondary font-mono">{rev.createdAt ? rev.createdAt.split('T')[0] : ''}</span>
                    </div>
                    {rev.metrics && (
                      <p className="text-xs text-text-primary font-mono">
                        Completion: {rev.metrics.completionRate}% • Planned: {rev.metrics.tasksPlannedCount} • Done: {rev.metrics.tasksCompletedCount}
                      </p>
                    )}
                    {rev.reflectionText && (
                      <p className="text-xs text-text-secondary italic">&ldquo;{rev.reflectionText}&rdquo;</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2 bg-bg-input hover:bg-bg-card border border-border-dark rounded-xl text-xs font-bold text-text-primary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
