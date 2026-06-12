import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { calendarService } from '../../services/calendarService';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Check, 
  X as CloseIcon, 
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Calendar() {
  const { user } = useContext(AuthContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected date modal state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedLogs, setSelectedLogs] = useState([]);

  useEffect(() => {
    async function loadCalendar() {
      if (!user) return;
      try {
        setLoading(true);
        const result = await calendarService.getCalendarData(user.userId);
        setLogs(result.logs || []);
        setHabits(result.habits || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load check-in calendar logs.');
      } finally {
        setLoading(false);
      }
    }
    loadCalendar();
  }, [user]);

  if (!user) return null;

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Calendar math calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week first day falls on (0 = Sun, 6 = Sat)

  // Generate calendar day cells
  const dayCells = [];

  // Pading for previous month offsets
  for (let i = 0; i < firstDayIndex; i++) {
    dayCells.push({ type: 'empty', key: `prev-${i}` });
  }

  // Actual days of month
  const todayStr = new Date().toISOString().split('T')[0];
  const joinDateStr = user.joinDate || todayStr;

  for (let day = 1; day <= daysInMonth; day++) {
    // Format cell date string: YYYY-MM-DD
    const dateObj = new Date(year, month, day);
    // Correct timezone shift for YYYY-MM-DD format
    const offset = dateObj.getTimezoneOffset();
    const shiftedDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
    const cellDateStr = shiftedDate.toISOString().split('T')[0];

    const isFuture = cellDateStr > todayStr;
    const isPriorToJoin = cellDateStr < joinDateStr;

    // Filter completions on this date
    const dateLogs = logs.filter((l) => l.date === cellDateStr);
    const dayCompletions = dateLogs.filter((l) => l.completed).length;

    let colorStatus = 'gray'; // Future
    if (!isFuture) {
      if (isPriorToJoin) {
        colorStatus = 'prior'; // Prior to user joining (neutral/blank)
      } else if (dayCompletions > 0) {
        colorStatus = 'green'; // Completed at least one
      } else {
        colorStatus = 'red'; // Missed (active tracking but no completions)
      }
    }

    dayCells.push({
      type: 'day',
      day,
      dateStr: cellDateStr,
      colorStatus,
      completions: dayCompletions,
      key: `day-${day}`
    });
  }

  // Handle cell click
  const handleCellClick = (cell) => {
    if (cell.type !== 'day') return;
    
    const cellDate = cell.dateStr;
    const dateLogs = logs.filter((l) => l.date === cellDate);
    
    // Map existing logs or create stubs for missing checkins
    const mappedHistory = habits.map(h => {
      const log = dateLogs.find(l => l.habitId === h.habitId);
      return {
        habitName: h.habitName,
        completed: log ? log.completed : false,
        logged: !!log
      };
    });

    setSelectedDate(cellDate);
    setSelectedLogs(mappedHistory);
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'green':
        return 'bg-emerald-500/25 border-emerald-500/50 hover:bg-emerald-500/35 text-emerald-400';
      case 'red':
        return 'bg-red-500/20 border-red-500/40 hover:bg-red-500/30 text-red-400';
      case 'prior':
        return 'bg-bg-input/30 border-border-dark/30 hover:border-brand-primary/20 text-text-secondary';
      default: // 'gray' / future
        return 'bg-bg-card/30 border-border-dark/20 text-text-secondary/50 cursor-not-allowed';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
          <CalendarIcon className="h-7 w-7 text-brand-primary mr-2.5" />
          Quest Calendar
        </h1>
        <p className="text-text-secondary text-sm">Track your historical quests consistency on a monthly grid view</p>
      </div>

      {/* Calendar Header Navigation */}
      <div className="bg-bg-card border border-border-dark rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {monthNames[month]} {year}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 bg-bg-input border border-border-dark rounded-lg hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 bg-bg-input border border-border-dark rounded-lg hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Grid Blocks */}
          {loading ? (
            <div className="grid grid-cols-7 gap-2 h-72 items-center justify-center">
              <div className="col-span-7 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {dayCells.map((cell) => {
                if (cell.type === 'empty') {
                  return <div key={cell.key} className="aspect-square bg-transparent" />;
                }

                const colorClass = getStatusColorClass(cell.colorStatus);
                const isToday = cell.dateStr === todayStr;

                return (
                  <button
                    key={cell.key}
                    disabled={cell.colorStatus === 'gray'}
                    onClick={() => handleCellClick(cell)}
                    className={`aspect-square border rounded-lg flex flex-col items-center justify-center relative p-1 transition-all ${colorClass} ${
                      isToday ? 'ring-2 ring-brand-primary border-brand-primary' : ''
                    } cursor-pointer`}
                  >
                    <span className="text-sm font-bold">{cell.day}</span>
                    {cell.completions > 0 && (
                      <span className="absolute bottom-1 text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full scale-90">
                        {cell.completions} Quest{cell.completions > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend Indicators */}
        <div className="pt-4 border-t border-border-dark flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold">
          <div className="flex items-center space-x-1.5">
            <div className="h-3 w-3 bg-emerald-500/20 border border-emerald-500/40 rounded" />
            <span className="text-text-secondary">Completed (Checked-in)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="h-3 w-3 bg-red-500/20 border border-red-500/40 rounded" />
            <span className="text-text-secondary">Missed (No Checkins)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="h-3 w-3 bg-bg-input/30 border border-border-dark/30 rounded" />
            <span className="text-text-secondary">Neutral (Prior to Join)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="h-3 w-3 bg-bg-card/30 border border-border-dark/20 rounded" />
            <span className="text-text-secondary">Future (Locked)</span>
          </div>
        </div>
      </div>

      {/* DATE LOG DETAILS MODAL */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedDate(null)} />
          
          <div className="bg-bg-card border border-border-dark rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-border-dark">
              <div>
                <h3 className="text-base font-bold text-white">Daily Quest Log</h3>
                <p className="text-[11px] text-text-secondary font-semibold">{selectedDate}</p>
              </div>
              <button 
                onClick={() => setSelectedDate(null)} 
                className="text-text-secondary hover:text-white p-1 rounded-lg hover:bg-bg-input transition-colors"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              {selectedLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-secondary">
                  No habits were active on this date.
                </div>
              ) : (
                selectedLogs.map((log, i) => (
                  <div 
                    key={i} 
                    className="p-3 bg-bg-dark/40 border border-border-dark rounded-xl flex items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-white truncate max-w-[200px]">{log.habitName}</span>
                    
                    {log.completed ? (
                      <span className="flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg">
                        <Check className="h-3 w-3 mr-1" />
                        Completed
                      </span>
                    ) : (
                      <span className="flex items-center text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded-lg">
                        <XCircle className="h-3 w-3 mr-1" />
                        Missed
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedDate(null)}
              className="w-full py-2.5 bg-bg-input border border-border-dark hover:text-white text-text-secondary text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close History Panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
