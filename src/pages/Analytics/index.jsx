import { useContext, useEffect, useState, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { TaskContext } from '../../context/TaskContext';
import { InvestmentContext } from '../../context/InvestmentContext';
import { analyticsService } from '../../services/analyticsService';
import { reviewService } from '../../services/reviewService';
import { calculateTaskAnalytics } from '../../utils/taskAnalytics';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  BarChart2, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  PieChart as PieIcon, 
  Info,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  DollarSign,
  Layers,
  Filter,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

// Custom tooltips styling moved outside render to comply with React component construction standards
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-card border border-border-dark p-3.5 rounded-xl shadow-xl text-xs">
        <p className="font-bold text-white mb-1.5">{label}</p>
        {payload.map((p, idx) => (
          <p key={idx} style={{ color: p.color || p.fill }} className="font-semibold mt-0.5">
            {p.name}: {p.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-card border border-border-dark p-3.5 rounded-xl shadow-xl text-xs text-white">
        <p className="font-bold">{payload[0].name}</p>
        <p className="text-brand-primary font-bold mt-1">Completed: {payload[0].value} times</p>
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { user } = useContext(AuthContext);
  const taskCtx = useContext(TaskContext);
  const tasks = taskCtx?.tasks || [];
  
  const investment = useContext(InvestmentContext);
  const goals = investment?.goals || [];

  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'habits'
  const [data, setData] = useState(null);
  const [reviewsHistory, setReviewsHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Task Analytics
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // 'all', 'this_week', '30d'
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        const [habitResult, reviewsResult] = await Promise.all([
          analyticsService.getAnalyticsData(user.userId).catch(() => null),
          reviewService.getReviewsHistory(user.userId).catch(() => [])
        ]);
        setData(habitResult);
        setReviewsHistory(reviewsResult || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load charts. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Compute Task Analytics
  const taskAnalytics = useMemo(() => {
    return calculateTaskAnalytics(tasks, [], reviewsHistory, goals, {
      dateRange: dateRangeFilter,
      category: categoryFilter
    });
  }, [tasks, reviewsHistory, goals, dateRangeFilter, categoryFilter]);

  if (!user) return null;

  // Chart Custom Colors mapping
  const CATEGORY_COLORS = {
    Gym: '#10b981',     // Emerald
    Reading: '#f59e0b', // Amber
    Coding: '#06b6d4',  // Cyan
    General: '#6366f1', // Indigo
    Business: '#3b82f6',
    Financial: '#10b981',
    Personal: '#ec4899',
    Health: '#84cc16'
  };

  const getPieCellColor = (categoryName) => {
    return CATEGORY_COLORS[categoryName] || '#8b5cf6';
  };

  // Check if habit logs exist
  const hasData = data && data.habitStats && data.habitStats.length > 0;
  const hasLogs = data && data.weeklyReport && data.weeklyReport.some(d => d.total > 0);

  // Stats summaries
  const averageSuccess = hasData 
    ? Math.round(data.habitStats.reduce((acc, h) => acc + h.successRate, 0) / data.habitStats.length)
    : 0;

  const totalLogsLogged = hasData
    ? data.habitStats.reduce((acc, h) => acc + h.completed, 0)
    : 0;

  // Distinct Categories from tasks
  const distinctCategories = Array.from(new Set(tasks.map(t => t.category).filter(Boolean)));

  // Priority Chart Data
  const priorityChartData = [
    { name: 'Critical', count: taskAnalytics.priorityDistribution.Critical, fill: '#ef4444' },
    { name: 'High', count: taskAnalytics.priorityDistribution.High, fill: '#f97316' },
    { name: 'Medium', count: taskAnalytics.priorityDistribution.Medium, fill: '#eab308' },
    { name: 'Low', count: taskAnalytics.priorityDistribution.Low, fill: '#3b82f6' }
  ];

  return (
    <div className="space-y-8">
      {/* Title Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
            <BarChart2 className="h-7 w-7 text-brand-primary mr-2.5" />
            Executive Analytics & Accountability
          </h1>
          <p className="text-text-secondary text-sm">Factual execution metrics, planning accuracy, workload distributions, and habit consistency</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 bg-bg-card border border-border-dark p-1.5 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'tasks'
                ? 'bg-brand-primary text-white shadow'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            📈 Tasks & Execution
          </button>
          <button
            onClick={() => setActiveTab('habits')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'habits'
                ? 'bg-brand-primary text-white shadow'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            🎯 Habits & Routines
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
        </div>
      ) : activeTab === 'tasks' ? (
        /* ========================================================================= */
        /* TASKS, GOALS & EXECUTION ANALYTICS (PHASE 7)                              */
        /* ========================================================================= */
        <div className="space-y-6 animate-fade-in">
          
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-card/70 border border-border-dark p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-xs text-text-secondary">
              <Filter className="h-4 w-4 text-brand-primary" />
              <span className="font-bold text-white">Date Range:</span>
              <div className="flex space-x-1.5">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'this_week', label: 'This Week' },
                  { id: '30d', label: 'Last 30 Days' }
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDateRangeFilter(d.id)}
                    className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                      dateRangeFilter === d.id
                        ? 'bg-brand-primary text-white'
                        : 'bg-bg-dark/50 text-text-secondary hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-text-secondary font-semibold">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-bg-dark border border-border-dark rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-primary"
              >
                <option value="all">All Categories</option>
                {distinctCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Continuous Improvement & Planning Accuracy Alerts */}
          {taskAnalytics.continuousImprovementAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mr-1.5" />
                Planning Accuracy & Improvement Opportunities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {taskAnalytics.continuousImprovementAlerts.slice(0, 4).map((alert, idx) => (
                  <div 
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs flex items-start space-x-3 ${
                      alert.severity === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-200'
                        : alert.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                    }`}
                  >
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">{alert.title}</p>
                      <p className="text-text-secondary mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Completion Rate */}
            <div className="p-5 bg-bg-card border border-border-dark rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[10px] font-bold uppercase tracking-wider">Task Completion Rate</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">{taskAnalytics.overallCompletionRate}%</h3>
              <p className="text-[10px] text-text-secondary">
                {taskAnalytics.completedCount} completed of {taskAnalytics.totalTasksCount - taskAnalytics.cancelledCount} eligible tasks
              </p>
            </div>

            {/* 2. Workload Hours */}
            <div className="p-5 bg-bg-card border border-border-dark rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Planned Workload</span>
                <Clock className="h-4 w-4 text-brand-primary" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">{taskAnalytics.totalWorkloadHours}h</h3>
              <p className="text-[10px] text-text-secondary">
                {taskAnalytics.activeCount} active tasks ({taskAnalytics.inProgressCount} in progress)
              </p>
            </div>

            {/* 3. Overdue & Deferrals */}
            <div className="p-5 bg-bg-card border border-border-dark rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[10px] font-bold uppercase tracking-wider">Overdue & Deferrals</span>
                <AlertTriangle className={`h-4 w-4 ${taskAnalytics.overdueCount > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
              </div>
              <h3 className="text-2xl font-extrabold text-white">
                {taskAnalytics.overdueCount} <span className="text-xs font-normal text-text-secondary">Overdue</span>
              </h3>
              <p className="text-[10px] text-text-secondary">
                {taskAnalytics.totalPlannedDeferred} task deferrals recorded across plans
              </p>
            </div>

            {/* 4. Estimation Accuracy */}
            <div className="p-5 bg-bg-card border border-border-dark rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[10px] font-bold uppercase tracking-wider">Estimation Variance</span>
                <TrendingUp className="h-4 w-4 text-purple-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">
                {taskAnalytics.hasActualDurationData
                  ? `${taskAnalytics.estimationVariancePercent > 0 ? '+' : ''}${taskAnalytics.estimationVariancePercent}%`
                  : 'N/A'}
              </h3>
              <p className="text-[10px] text-text-secondary">
                {taskAnalytics.hasActualDurationData
                  ? `Based on ${taskAnalytics.tasksWithActualDurationCount} tasks with logged duration`
                  : 'Log actual task duration to track accuracy'}
              </p>
            </div>

          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Priority Distribution Chart */}
            <div className="bg-bg-card border border-border-dark rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center">
                  <Layers className="h-4.5 w-4.5 text-brand-primary mr-2" />
                  Priority Distribution (Calculated Scores)
                </h3>
                <span className="text-[10px] text-text-secondary font-mono">Formula: 5-Factor Score</span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                    <YAxis allowDecimals={false} stroke="#9ca3af" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#151b2c', borderColor: '#1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" name="Tasks" radius={[6, 6, 0, 0]}>
                      {priorityChartData.map((entry, idx) => (
                        <Cell key={`bar-${idx}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-between items-center text-[10px] text-text-secondary pt-2 border-t border-border-dark/60">
                <span>Critical: Score $\ge 80$</span>
                <span>High: 65–79</span>
                <span>Medium: 50–64</span>
                <span>Low: $&lt; 50$</span>
              </div>
            </div>

            {/* Project-Level Workload */}
            <div className="bg-bg-card border border-border-dark rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center">
                  <Target className="h-4.5 w-4.5 text-purple-400 mr-2" />
                  Workload by Project Area (Hours)
                </h3>
                <span className="text-[10px] text-text-secondary font-mono">{taskAnalytics.projectWorkload.length} Projects</span>
              </div>

              {taskAnalytics.projectWorkload.length > 0 ? (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskAnalytics.projectWorkload} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} horizontal={false} />
                      <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#151b2c', borderColor: '#1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '11px' }}
                      />
                      <Bar dataKey="hours" name="Workload (Hours)" fill="#6366f1" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-text-secondary">
                  No project tasks recorded for selected range.
                </div>
              )}

              <p className="text-[10px] text-text-secondary pt-2 border-t border-border-dark/60 leading-normal">
                Shows aggregated estimated workload hours allocated across project initiatives.
              </p>
            </div>

          </div>

          {/* Goal & Milestone Alignment Table */}
          <div className="bg-bg-card border border-border-dark rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center">
                  <Target className="h-4.5 w-4.5 text-emerald-400 mr-2" />
                  Strategic Goals & Linked Task Progress
                </h3>
                <p className="text-[11px] text-text-secondary">Tracks actual milestone progress directly derived from completed linked tasks</p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-text-secondary">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-white">Revenue Activity:</span>
                <span className="text-emerald-400 font-bold">{taskAnalytics.completedRevenueTasksCount} completed</span>
                <span className="text-text-secondary">({taskAnalytics.revenueTaskCompletionRate}%)</span>
              </div>
            </div>

            {taskAnalytics.goalProgress.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-dark text-[10px] font-bold text-text-secondary uppercase">
                      <th className="py-2.5 px-3">Goal Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Linked Tasks</th>
                      <th className="py-2.5 px-3">Milestone Progress</th>
                      <th className="py-2.5 px-3">Financial Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark/50">
                    {taskAnalytics.goalProgress.map(g => (
                      <tr key={g.goalId} className="hover:bg-bg-dark/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-white">{g.name}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-dark border border-border-dark text-text-secondary">
                            {g.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-text-secondary">
                          {g.completedLinked} of {g.totalLinked} completed
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-bg-dark rounded-full h-2 overflow-hidden border border-border-dark">
                              <div 
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${g.milestoneRate}%` }}
                              />
                            </div>
                            <span className="font-bold text-white text-[11px]">{g.milestoneRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400">
                          {g.targetAmount ? `₹${Number(g.targetAmount).toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-text-secondary">
                No financial or strategic goals found. Add goals in Roadmap / Financial Goals to link your tasks.
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ========================================================================= */
        /* HABITS & CONSISTENCY (PRESERVED FROM EARLIER PHASES)                      */
        /* ========================================================================= */
        !hasData || !hasLogs ? (
          <div className="text-center py-16 bg-bg-card border border-border-dark rounded-2xl p-8 max-w-md mx-auto">
            <BarChart2 className="h-12 w-12 text-brand-primary mx-auto mb-4 opacity-40 animate-pulse" />
            <h3 className="text-lg font-bold text-white mb-2">Insufficient Habit Analytics Data</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              We need you to log habit checks over a few days to compute charts. Head over to the dashboard to begin!
            </p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            
            {/* Executive Stats Summary */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-bg-card border border-border-dark rounded-xl">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Overall Quest Success Rate</span>
                <h3 className="text-2xl font-extrabold text-brand-primary mt-1.5">{averageSuccess}%</h3>
                <p className="text-[10px] text-text-secondary mt-1">Average consistency across all active habits</p>
              </div>
              <div className="p-5 bg-bg-card border border-border-dark rounded-xl">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Total Quest Checks</span>
                <h3 className="text-2xl font-extrabold text-emerald-400 mt-1.5">{totalLogsLogged} Checks</h3>
                <p className="text-[10px] text-text-secondary mt-1">Total times you checked off habits successfully</p>
              </div>
              <div className="p-5 bg-bg-card border border-border-dark rounded-xl">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Longest Streak</span>
                <h3 className="text-2xl font-extrabold text-orange-400 mt-1.5">{user.longestStreak || 0} Days</h3>
                <p className="text-[10px] text-text-secondary mt-1">Your record consistency length in history</p>
              </div>
            </section>

            {/* Charts Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Weekly Completion Line Chart */}
              <div className="lg:col-span-2 bg-bg-card border border-border-dark rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center">
                  <CalendarIcon className="h-4.5 w-4.5 text-brand-primary mr-2" />
                  Weekly Completion Rates (%)
                </h3>
                
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.weeklyReport} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={10} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="percent" 
                        name="Completion Rate" 
                        stroke="url(#lineGrad)" 
                        strokeWidth={3}
                        activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                      />
                      <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#c084fc" />
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Split Pie Chart */}
              <div className="bg-bg-card border border-border-dark rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center">
                  <PieIcon className="h-4.5 w-4.5 text-purple-400 mr-2" />
                  Category Performance Split
                </h3>

                {data.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
                  <div className="h-72 w-full flex flex-col justify-center items-center">
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.categoryBreakdown}
                            dataKey="value"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {data.categoryBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getPieCellColor(entry.category)} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Custom Legend */}
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-[10px] font-bold">
                      {data.categoryBreakdown.map((entry, idx) => (
                        <div key={idx} className="flex items-center space-x-1.5">
                          <div 
                            className="h-2.5 w-2.5 rounded-full" 
                            style={{ backgroundColor: getPieCellColor(entry.category) }} 
                          />
                          <span className="text-text-secondary">{entry.category}: {entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-xs text-text-secondary text-center p-6">
                    Log a specific quest from categories (Gym, Reading, Coding) to unlock the category breakdown.
                  </div>
                )}
              </div>

              {/* Habit Specific Success Rates Bar Chart */}
              <div className="lg:col-span-3 bg-bg-card border border-border-dark rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center">
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-400 mr-2" />
                  Success Rate Per Habit (%)
                </h3>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.habitStats} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                      <XAxis dataKey="habitName" stroke="#9ca3af" fontSize={10} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={10} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="successRate" name="Success Rate" fill="#6366f1" radius={[4, 4, 0, 0]}>
                        {data.habitStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getPieCellColor(entry.category)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Informational Alert Footer */}
                <div className="flex items-start space-x-2 bg-bg-dark/30 border border-border-dark p-3.5 rounded-xl">
                  <Info className="h-4.5 w-4.5 text-brand-primary flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-text-secondary leading-normal">
                    How success rate is calculated: The percentage is derived from the number of completed check-ins divided by the total logged days of the habit since creation.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )
      )}
    </div>
  );
}
