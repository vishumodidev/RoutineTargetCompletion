import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
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
  Info
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        const result = await analyticsService.getAnalyticsData(user.userId);
        setData(result);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load charts. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (!user) return null;

  // Chart Custom Colors mapping
  const CATEGORY_COLORS = {
    Gym: '#10b981',     // Emerald
    Reading: '#f59e0b', // Amber
    Coding: '#06b6d4',  // Cyan
    General: '#6366f1'  // Indigo
  };

  const getPieCellColor = (categoryName) => {
    return CATEGORY_COLORS[categoryName] || '#8b5cf6';
  };

  // Check if logs exist
  const hasData = data && data.habitStats && data.habitStats.length > 0;
  const hasLogs = data && data.weeklyReport && data.weeklyReport.some(d => d.total > 0);

  // Stats summaries
  const averageSuccess = hasData 
    ? Math.round(data.habitStats.reduce((acc, h) => acc + h.successRate, 0) / data.habitStats.length)
    : 0;

  const totalLogsLogged = hasData
    ? data.habitStats.reduce((acc, h) => acc + h.completed, 0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
          <BarChart2 className="h-7 w-7 text-brand-primary mr-2.5" />
          Analytics Dashboard
        </h1>
        <p className="text-text-secondary text-sm">Visualize your habit completion trends, category splits, and daily check-ins</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
        </div>
      ) : !hasData || !hasLogs ? (
        <div className="text-center py-16 bg-bg-card border border-border-dark rounded-2xl p-8 max-w-md mx-auto">
          <BarChart2 className="h-12 w-12 text-brand-primary mx-auto mb-4 opacity-40 animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-2">Insufficient Analytics Data</h3>
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
      )}
    </div>
  );
}
