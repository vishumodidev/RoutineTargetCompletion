import { useContext, useState } from 'react';
import { TaskContext } from '../../context/TaskContext';
import { InvestmentContext } from '../../context/InvestmentContext';
import { DashboardContext } from '../../context/DashboardContext';
import { 
  TASK_CATEGORIES, 
  TASK_STATUSES, 
  TASK_PRIORITIES, 
  DEADLINE_TYPES, 
  INCOME_IMPACTS 
} from '../../constants';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Edit3, 
  Target, 
  Flame, 
  ArrowRight,
  TrendingUp,
  X,
  Layers,
  Sparkles,
  Info,
  ArrowUpDown,
  AlertTriangle,
  ShieldAlert,
  Briefcase
} from 'lucide-react';

export default function Tasks() {
  const { 
    filteredTasks, 
    loading, 
    stats, 
    selectedCategory, 
    setSelectedCategory, 
    selectedStatus, 
    setSelectedStatus, 
    searchQuery, 
    setSearchQuery, 
    sortBy,
    setSortBy,
    createTask, 
    updateTask, 
    removeTask, 
    toggleTaskComplete 
  } = useContext(TaskContext);

  const { goals } = useContext(InvestmentContext);
  const dashboard = useContext(DashboardContext);
  const opportunities = dashboard?.opportunities || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [explainingTask, setExplainingTask] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'AI Agent Development',
    projectArea: '',
    linkedGoalId: '',
    linkedOpportunityId: '',
    priority: 'Medium',
    status: 'Planned',
    estimatedDuration: 60,
    actualDuration: 0,
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    deadlineType: 'Flexible',
    dependencies: '',
    incomeImpact: 'None',
    importance: 50,
    urgency: 50,
    readiness: 100,
    nextAction: '',
    recurrence: 'None'
  });

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      category: 'AI Agent Development',
      projectArea: '',
      linkedGoalId: '',
      linkedOpportunityId: '',
      priority: 'Medium',
      status: 'Planned',
      estimatedDuration: 60,
      actualDuration: 0,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      deadlineType: 'Flexible',
      dependencies: '',
      incomeImpact: 'None',
      importance: 50,
      urgency: 50,
      readiness: 100,
      nextAction: '',
      recurrence: 'None'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      category: task.category || 'General',
      projectArea: task.projectArea || '',
      linkedGoalId: task.linkedGoalId || '',
      linkedOpportunityId: task.linkedOpportunityId || '',
      priority: task.priority || 'Medium',
      status: task.status || 'Planned',
      estimatedDuration: task.estimatedDuration || 0,
      actualDuration: task.actualDuration || 0,
      startDate: task.startDate || '',
      dueDate: task.dueDate || '',
      deadlineType: task.deadlineType || 'Flexible',
      dependencies: task.dependencies || '',
      incomeImpact: task.incomeImpact || 'None',
      importance: task.importance !== undefined ? task.importance : 50,
      urgency: task.urgency !== undefined ? task.urgency : 50,
      readiness: task.readiness !== undefined ? task.readiness : 100,
      nextAction: task.nextAction || '',
      recurrence: task.recurrence || 'None'
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingTask) {
      await updateTask({
        ...editingTask,
        ...formData
      });
    } else {
      await createTask(formData);
    }
    setModalOpen(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const getPriorityScoreBadge = (score, band) => {
    if (score >= 80) {
      return {
        badge: 'bg-red-500/20 text-red-400 border-red-500/40 shadow-sm shadow-red-500/10',
        label: `${score}/100 • Critical`
      };
    }
    if (score >= 60) {
      return {
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        label: `${score}/100 • High`
      };
    }
    if (score >= 40) {
      return {
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        label: `${score}/100 • Medium`
      };
    }
    return {
      badge: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
      label: `${score}/100 • Low`
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'In Progress':
        return 'bg-brand-primary/20 text-brand-primary border-brand-primary/30';
      case 'Blocked':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'Planned':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center text-text-primary">
            <CheckSquare className="h-7 w-7 text-brand-primary mr-3" />
            Unified Task Management
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Deterministic 5-factor priority scoring engine ranking career growth, client deliverables, and personal goals.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-lg transition-colors shadow-lg shadow-brand-primary/20"
        >
          <Plus className="h-5 w-5 mr-1.5" />
          Create Task
        </button>
      </div>

      {/* Quick Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-bg-card border border-border-dark p-3.5 rounded-xl">
          <p className="text-xs text-text-secondary font-medium">Total Tasks</p>
          <p className="text-xl font-bold mt-1 text-text-primary">{stats.total}</p>
        </div>
        <div className="bg-bg-card border border-border-dark p-3.5 rounded-xl">
          <p className="text-xs text-text-secondary font-medium">Critical Priority</p>
          <p className="text-xl font-bold mt-1 text-red-400">{stats.criticalCount || 0}</p>
        </div>
        <div className="bg-bg-card border border-border-dark p-3.5 rounded-xl">
          <p className="text-xs text-text-secondary font-medium">In Progress</p>
          <p className="text-xl font-bold mt-1 text-brand-primary">{stats.inProgress}</p>
        </div>
        <div className="bg-bg-card border border-border-dark p-3.5 rounded-xl">
          <p className="text-xs text-text-secondary font-medium">Planned</p>
          <p className="text-xl font-bold mt-1 text-indigo-400">{stats.planned}</p>
        </div>
        <div className="bg-bg-card border border-border-dark p-3.5 rounded-xl">
          <p className="text-xs text-text-secondary font-medium">Completed</p>
          <p className="text-xl font-bold mt-1 text-emerald-400">{stats.completed}</p>
        </div>
        <div className="bg-bg-card border border-border-dark p-3.5 rounded-xl">
          <p className="text-xs text-text-secondary font-medium">Completion Rate</p>
          <p className="text-xl font-bold mt-1 text-amber-400">{stats.completionRate}%</p>
        </div>
      </div>

      {/* Filters, Search & Sort Control Bar */}
      <div className="bg-bg-card border border-border-dark p-4 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by title, project, or next action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-input border border-border-dark rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-brand-primary"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-52">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="All">All Categories</option>
              {TASK_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="All">All Statuses</option>
              {TASK_STATUSES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Sort By Filter */}
          <div className="w-full md:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary flex items-center"
            >
              <option value="priority">Sort: Priority Score</option>
              <option value="dueDate">Sort: Due Date</option>
              <option value="title">Sort: Title</option>
              <option value="created">Sort: Recently Created</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-bg-card border border-border-dark rounded-xl p-12 text-center">
            <CheckSquare className="h-12 w-12 text-text-secondary/40 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-text-primary">No tasks found</h3>
            <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
              {searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All'
                ? 'Try clearing your search or category filters to see more tasks.'
                : 'Get started by creating your first actionable task to track today.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-medium rounded-lg inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Task
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const isOverdue = task.dueDate && task.dueDate < todayStr && !isCompleted;
            const linkedGoal = goals.find(g => g.id === task.linkedGoalId);
            const linkedOpp = opportunities.find(o => o.id === task.linkedOpportunityId);
            const scoreDetails = getPriorityScoreBadge(task.priorityScore, task.priorityBand);

            return (
              <div
                key={task.taskId}
                className={`bg-bg-card border rounded-xl p-4 transition-all duration-200 hover:border-brand-primary/40 ${
                  isCompleted 
                    ? 'border-border-dark/60 opacity-75' 
                    : isOverdue 
                      ? 'border-red-500/40 bg-red-950/10' 
                      : 'border-border-dark'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Complete toggle + Title + Details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTaskComplete(task.taskId)}
                      className="mt-0.5 text-text-secondary hover:text-brand-primary focus:outline-none transition-colors"
                      title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <Circle className="h-5 w-5 hover:border-brand-primary" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className={`text-base font-semibold truncate ${
                          isCompleted ? 'line-through text-text-secondary' : 'text-text-primary'
                        }`}>
                          {task.title}
                        </h4>

                        {/* Deterministic Priority Score Badge */}
                        <button
                          onClick={() => setExplainingTask(task)}
                          className={`text-[11px] font-black px-2 py-0.5 rounded border flex items-center transition-transform hover:scale-105 ${scoreDetails.badge}`}
                          title="Click to view mathematical factor breakdown"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {scoreDetails.label}
                          <Info className="h-2.5 w-2.5 ml-1 opacity-70" />
                        </button>

                        {/* Manual Override Indicator */}
                        {task.isManualOverride && (
                          <span 
                            className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded flex items-center"
                            title="Urgent user override: Manually tagged Critical"
                          >
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            Urgent Override
                          </span>
                        )}

                        {/* Status Badge */}
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${getStatusBadge(task.status)}`}>
                          {task.status}
                        </span>

                        {/* Income Impact Badge */}
                        {task.incomeImpact && task.incomeImpact !== 'None' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex items-center">
                            <Flame className="h-3 w-3 mr-0.5" />
                            {task.incomeImpact} Revenue Impact
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-text-secondary mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Meta Information Tags */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                        {/* Category */}
                        <span className="flex items-center text-text-secondary/90">
                          <Layers className="h-3.5 w-3.5 mr-1 text-brand-primary" />
                          {task.category}
                        </span>

                        {/* Project Area */}
                        {task.projectArea && (
                          <span className="text-text-secondary/80">
                            • {task.projectArea}
                          </span>
                        )}

                        {/* Due Date */}
                        {task.dueDate && (
                          <span className={`flex items-center ${
                            isOverdue ? 'text-red-400 font-semibold' : 'text-text-secondary'
                          }`}>
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            {task.dueDate}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        )}

                        {/* Estimated Duration */}
                        {task.estimatedDuration > 0 && (
                          <span className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {task.estimatedDuration}m est
                            {task.actualDuration > 0 && ` / ${task.actualDuration}m act`}
                          </span>
                        )}

                        {/* Linked Goal */}
                        {linkedGoal && (
                          <span className="flex items-center text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            <Target className="h-3 w-3 mr-1" />
                            {linkedGoal.name}
                          </span>
                        )}

                        {/* Linked Opportunity */}
                        {linkedOpp && (
                          <span className="flex items-center text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20" title={`Sales Pipeline: ${linkedOpp.stage}`}>
                            <Briefcase className="h-3 w-3 mr-1" />
                            {linkedOpp.title || linkedOpp.clientName} (₹{Number(linkedOpp.value || 0).toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>

                      {/* Next Action Callout */}
                      {task.nextAction && (
                        <div className="mt-2.5 text-xs bg-bg-input/60 border border-border-dark/80 px-2.5 py-1.5 rounded-lg flex items-center text-brand-primary font-medium">
                          <ArrowRight className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          <span className="text-text-secondary mr-1">Next Step:</span>
                          <span className="truncate">{task.nextAction}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-input transition-colors"
                      title="Edit task"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (deleteConfirmId === task.taskId) {
                          removeTask(task.taskId);
                          setDeleteConfirmId(null);
                        } else {
                          setDeleteConfirmId(task.taskId);
                          setTimeout(() => setDeleteConfirmId(null), 3500);
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        deleteConfirmId === task.taskId
                          ? 'bg-red-500/20 text-red-400'
                          : 'text-text-secondary hover:text-red-400 hover:bg-bg-input'
                      }`}
                      title={deleteConfirmId === task.taskId ? 'Click again to confirm delete' : 'Delete task'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Score Explanation Modal */}
      {explainingTask && explainingTask.scoreBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card border border-border-dark rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-border-dark pb-3">
              <div>
                <h3 className="text-lg font-bold text-text-primary flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-brand-primary" />
                  Priority Score Explanation
                </h3>
                <p className="text-xs text-text-secondary mt-0.5 truncate max-w-sm">
                  {explainingTask.title}
                </p>
              </div>
              <button
                onClick={() => setExplainingTask(null)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Score Banner */}
            <div className="bg-bg-input p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Overall Priority Score</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-text-primary">{explainingTask.priorityScore}</span>
                  <span className="text-sm text-text-secondary">/ 100</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ml-2 ${getPriorityScoreBadge(explainingTask.priorityScore).badge}`}>
                    {explainingTask.priorityBand}
                  </span>
                </div>
              </div>

              {explainingTask.isManualOverride && (
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded inline-flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Urgent Override
                  </span>
                </div>
              )}
            </div>

            {/* Factor Breakdown */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Contributing Factors (5-Factor Formula)
              </h4>

              {/* Urgency */}
              <div className="bg-bg-input/60 border border-border-dark p-2.5 rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary">1. Deadline Urgency (30% weight)</span>
                  <span className="font-mono text-brand-primary font-bold">
                    +{explainingTask.scoreBreakdown.urgency.weighted} pts ({explainingTask.scoreBreakdown.urgency.raw}/100)
                  </span>
                </div>
                <p className="text-text-secondary">{explainingTask.scoreBreakdown.urgency.reason}</p>
              </div>

              {/* Goal Alignment */}
              <div className="bg-bg-input/60 border border-border-dark p-2.5 rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary">2. Goal Alignment (25% weight)</span>
                  <span className="font-mono text-purple-400 font-bold">
                    +{explainingTask.scoreBreakdown.goalAlignment.weighted} pts ({explainingTask.scoreBreakdown.goalAlignment.raw}/100)
                  </span>
                </div>
                <p className="text-text-secondary">{explainingTask.scoreBreakdown.goalAlignment.reason}</p>
              </div>

              {/* Income Impact */}
              <div className="bg-bg-input/60 border border-border-dark p-2.5 rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary">3. Income & Business Impact (20% weight)</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    +{explainingTask.scoreBreakdown.incomeImpact.weighted} pts ({explainingTask.scoreBreakdown.incomeImpact.raw}/100)
                  </span>
                </div>
                <p className="text-text-secondary">{explainingTask.scoreBreakdown.incomeImpact.reason}</p>
              </div>

              {/* Dependency */}
              <div className="bg-bg-input/60 border border-border-dark p-2.5 rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary">4. Dependency Importance (15% weight)</span>
                  <span className="font-mono text-amber-400 font-bold">
                    +{explainingTask.scoreBreakdown.dependency.weighted} pts ({explainingTask.scoreBreakdown.dependency.raw}/100)
                  </span>
                </div>
                <p className="text-text-secondary">{explainingTask.scoreBreakdown.dependency.reason}</p>
              </div>

              {/* Readiness */}
              <div className="bg-bg-input/60 border border-border-dark p-2.5 rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary">5. Execution Readiness (10% weight)</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    +{explainingTask.scoreBreakdown.readiness.weighted} pts ({explainingTask.scoreBreakdown.readiness.raw}/100)
                  </span>
                </div>
                <p className="text-text-secondary">{explainingTask.scoreBreakdown.readiness.reason}</p>
              </div>
            </div>

            {/* Summary sentence */}
            <div className="bg-bg-input/30 p-3 rounded-lg border border-border-dark text-xs text-text-secondary italic">
              &quot;{explainingTask.scoreSummary}&quot;
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setExplainingTask(null)}
                className="px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card border border-border-dark rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
            <div className="sticky top-0 bg-bg-card border-b border-border-dark px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-text-primary flex items-center">
                {editingTask ? <Edit3 className="h-5 w-5 mr-2 text-brand-primary" /> : <Plus className="h-5 w-5 mr-2 text-brand-primary" />}
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build Lead Qualification Workflow"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-bg-input border border-border-dark rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-bg-input border border-border-dark rounded-lg px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Category & Project Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  >
                    {TASK_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Project / Business Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AI CRM Agent, MI Sales"
                    value={formData.projectArea}
                    onChange={(e) => setFormData({ ...formData, projectArea: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Manual Priority Tag
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  >
                    {TASK_PRIORITIES.map(pri => (
                      <option key={pri} value={pri}>{pri}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  >
                    {TASK_STATUSES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Deadline Type
                  </label>
                  <select
                    value={formData.deadlineType}
                    onChange={(e) => setFormData({ ...formData, deadlineType: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  >
                    {DEADLINE_TYPES.map(dl => (
                      <option key={dl} value={dl}>{dl}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimated Duration & Income Impact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Estimated Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="15"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedDuration: Number(e.target.value) })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Income / Business Impact
                  </label>
                  <select
                    value={formData.incomeImpact}
                    onChange={(e) => setFormData({ ...formData, incomeImpact: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  >
                    {INCOME_IMPACTS.map(imp => (
                      <option key={imp} value={imp}>{imp}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linked Goal */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Linked Financial Goal / Milestone
                </label>
                <select
                  value={formData.linkedGoalId}
                  onChange={(e) => setFormData({ ...formData, linkedGoalId: e.target.value })}
                  className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                >
                  <option value="">None (Independent task)</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Opportunity / Sales Lead */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Linked Opportunity / Sales Lead
                </label>
                <select
                  value={formData.linkedOpportunityId || ''}
                  onChange={(e) => setFormData({ ...formData, linkedOpportunityId: e.target.value })}
                  className="w-full bg-bg-input border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                >
                  <option value="">None (Independent task)</option>
                  {opportunities.map(opp => (
                    <option key={opp.id} value={opp.id}>
                      {opp.title || opp.clientName} ({opp.stage} • ₹{Number(opp.value || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Next Action Callout */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Next Concrete Action
                </label>
                <input
                  type="text"
                  placeholder="e.g. Draft the first 3 unit tests in vitest"
                  value={formData.nextAction}
                  onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                  className="w-full bg-bg-input border border-border-dark rounded-lg px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border-dark">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-input transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-brand-primary/20"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
