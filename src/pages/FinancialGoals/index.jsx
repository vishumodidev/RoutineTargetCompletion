import { useContext, useState, useMemo } from 'react';
import { InvestmentContext } from '../../context/InvestmentContext';
import { formatINR } from '../../services/investmentService';
import { 
  Target, 
  ShieldCheck, 
  Home, 
  HeartHandshake, 
  TrendingUp, 
  Plus, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Info, 
  Sparkles, 
  Flame,
  ArrowRight,
  PiggyBank
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FinancialGoals() {
  const { goals, saveGoal, deleteGoal, summary } = useContext(InvestmentContext);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Emergency',
    targetAmount: '',
    downPaymentTarget: '',
    registrationCosts: '',
    currentBalance: '',
    monthlyTarget: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    priority: 'High',
    status: 'In progress',
    notes: ''
  });

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingGoal(null);
    setFormData({
      name: '',
      category: 'Emergency',
      targetAmount: '',
      downPaymentTarget: '',
      registrationCosts: '',
      currentBalance: '',
      monthlyTarget: '',
      startDate: new Date().toISOString().split('T')[0],
      deadline: '',
      priority: 'High',
      status: 'In progress',
      notes: ''
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name || '',
      category: goal.category || 'Emergency',
      targetAmount: goal.targetAmount || '',
      downPaymentTarget: goal.downPaymentTarget || '',
      registrationCosts: goal.registrationCosts || '',
      currentBalance: goal.currentBalance || '',
      monthlyTarget: goal.monthlyTarget || '',
      startDate: goal.startDate || new Date().toISOString().split('T')[0],
      deadline: goal.deadline || '',
      priority: goal.priority || 'High',
      status: goal.status || 'In progress',
      notes: goal.notes || ''
    });
    setModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.targetAmount || Number(formData.targetAmount) <= 0) {
      toast.error('Please enter a valid goal name and target amount');
      return;
    }

    const payload = {
      id: editingGoal ? editingGoal.id : 'goal_' + Math.random().toString(36).substr(2, 9),
      name: formData.name,
      category: formData.category,
      targetAmount: Number(formData.targetAmount),
      downPaymentTarget: formData.downPaymentTarget ? Number(formData.downPaymentTarget) : undefined,
      registrationCosts: formData.registrationCosts ? Number(formData.registrationCosts) : undefined,
      currentBalance: Number(formData.currentBalance) || 0,
      monthlyTarget: Number(formData.monthlyTarget) || 0,
      actualContributionsThisMonth: editingGoal ? editingGoal.actualContributionsThisMonth || 0 : 0,
      startDate: formData.startDate,
      deadline: formData.deadline,
      priority: formData.priority,
      status: formData.status,
      notes: formData.notes
    };

    saveGoal(payload);
    setModalOpen(false);
  };

  const handleDelete = (goalId) => {
    if (window.confirm('Are you sure you want to delete this financial goal?')) {
      deleteGoal(goalId);
    }
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'On track':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Completed':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'In progress':
        return 'bg-brand-primary/15 text-brand-primary border-brand-primary/30';
      case 'At risk':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Overdue':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'Paused':
        return 'bg-bg-input text-text-secondary border-border-dark';
      default:
        return 'bg-bg-input text-text-secondary border-border-dark';
    }
  };

  // Category Icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Emergency':
        return ShieldCheck;
      case 'Real Estate':
        return Home;
      case 'Family / Child Future':
        return HeartHandshake;
      case 'Wealth Creation':
        return TrendingUp;
      default:
        return PiggyBank;
    }
  };

  // Calculate estimated completion months
  const getEstimatedTimeline = (target, current, monthly) => {
    const remaining = Math.max(0, target - current);
    if (!monthly || monthly <= 0) return 'Requires monthly savings allocation';
    const months = Math.ceil(remaining / monthly);
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (years > 0) {
      return `~${years} yr ${remMonths > 0 ? `${remMonths} mo` : ''} at ₹${monthly.toLocaleString('en-IN')}/mo (estimated)`;
    }
    return `~${months} months at ₹${monthly.toLocaleString('en-IN')}/mo (estimated)`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border-dark pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Financial Goals & Milestones
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-medium">
                  Configurable Portfolio Targets
                </span>
              </h1>
              <p className="text-xs text-text-secondary mt-0.5">
                Target deadlines, essential emergency buffer, ₹50 Lakh property plan, and daughter's future fund.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center self-start md:self-auto px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-lg transition-colors shadow-lg shadow-brand-primary/20"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Financial Goal
        </button>
      </div>

      {/* Disclaimers & Estimation Notice */}
      <div className="p-3.5 rounded-xl bg-bg-card border border-border-dark text-text-secondary text-xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Info className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Capital Preservation Principle:</strong> Projected completion dates are non-guaranteed estimates based strictly on user savings inputs. Property acquisition goals distinguish cash down payments from financed balances.
          </span>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const IconComponent = getCategoryIcon(goal.category);
          const percent = Math.min(100, Math.round(((goal.currentBalance || 0) / (goal.targetAmount || 1)) * 100));
          const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.currentBalance || 0));

          return (
            <div 
              key={goal.id} 
              className="bg-bg-card border border-border-dark rounded-xl p-5 md:p-6 shadow-sm hover:border-border-dark/80 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Category & Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-lg bg-bg-input flex items-center justify-center text-brand-primary">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
                        {goal.category}
                      </span>
                      <h3 className="text-base font-bold text-white leading-tight">
                        {goal.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadge(goal.status)}`}>
                      {goal.status}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      className="p-1.5 text-text-secondary hover:text-white rounded-lg hover:bg-bg-input"
                      title="Edit Goal"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1.5 text-text-secondary hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Target & Balance Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 bg-bg-input/40 p-3.5 rounded-lg border border-border-dark/60 text-xs">
                  <div>
                    <span className="text-[11px] text-text-secondary block">Target Amount</span>
                    <p className="text-sm font-bold text-white mt-0.5">{formatINR(goal.targetAmount)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-secondary block">Current Allocated</span>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatINR(goal.currentBalance)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-secondary block">Remaining Gap</span>
                    <p className="text-sm font-bold text-rose-400 mt-0.5">{formatINR(remaining)}</p>
                  </div>
                </div>

                {/* Special property breakdown for house goal */}
                {goal.category === 'Real Estate' && goal.downPaymentTarget && (
                  <div className="p-3 bg-bg-dark/60 rounded-lg border border-purple-500/20 text-xs mb-4 space-y-1">
                    <div className="flex justify-between text-text-secondary">
                      <span>Intended Down Payment (Cash):</span>
                      <span className="font-semibold text-white">{formatINR(goal.downPaymentTarget)}</span>
                    </div>
                    {goal.registrationCosts && (
                      <div className="flex justify-between text-text-secondary">
                        <span>Registration & Purchase Costs:</span>
                        <span className="font-semibold text-white">{formatINR(goal.registrationCosts)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-text-secondary pt-1 border-t border-border-dark">
                      <span>Remaining Property Financed:</span>
                      <span className="font-semibold text-purple-400">
                        {formatINR(Math.max(0, goal.targetAmount - goal.downPaymentTarget - (goal.registrationCosts || 0)))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-text-secondary">Accumulated Progress</span>
                    <span className="text-white">{percent}%</span>
                  </div>
                  <div className="w-full bg-bg-input h-2 rounded-full overflow-hidden border border-border-dark">
                    <div 
                      className="bg-gradient-to-r from-brand-primary to-purple-400 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Notes if available */}
                {goal.notes && (
                  <p className="text-xs text-text-secondary italic mb-4">
                    "{goal.notes}"
                  </p>
                )}
              </div>

              {/* Bottom Metadata */}
              <div className="pt-3 border-t border-border-dark/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-text-secondary">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="h-3.5 w-3.5 text-brand-primary" />
                  <span>Target Deadline: <strong className="text-white">{goal.deadline || 'Unspecified'}</strong></span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{getEstimatedTimeline(goal.targetAmount, goal.currentBalance, goal.monthlyTarget)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review Cadence & Strategy Checklist */}
      <div className="bg-bg-card border border-border-dark rounded-xl p-5 md:p-6 shadow-sm">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-amber-400" />
          Financial Review Cadence & Strategy Checks
        </h3>
        <p className="text-xs text-text-secondary mb-4">
          Structured review protocol to evaluate capital allocation without compromising health or career milestones.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-bg-input/30 border border-border-dark space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Monthly Review</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-semibold">Every 30 Days</span>
            </div>
            <ul className="text-text-secondary space-y-1 list-disc list-inside">
              <li>Verify actual SBI Small Cap SIP debit (₹3,000)</li>
              <li>Reconcile confirmed received income against expenses</li>
              <li>Deposit monthly buffer into Emergency & House funds</li>
              <li>Ensure no unauthorized fund additions occurred</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-bg-input/30 border border-border-dark space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Quarterly Review</span>
              <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded font-semibold">Every 90 Days</span>
            </div>
            <ul className="text-text-secondary space-y-1 list-disc list-inside">
              <li>Assess income progression toward ₹1.5L milestone</li>
              <li>Check Emergency Fund coverage against current living spend</li>
              <li>Evaluate whether career surplus allows activating Fund #2</li>
              <li>Review Term & Health insurance upcoming premium dates</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-bg-input/30 border border-border-dark space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Annual Strategy Review</span>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-semibold">Yearly (December)</span>
            </div>
            <ul className="text-text-secondary space-y-1 list-disc list-inside">
              <li>Comprehensive portfolio rebalance & tax health check</li>
              <li>House Purchase 2033 progress against down payment goal</li>
              <li>Review long-term corpus growth (Mutual Fund + Bank assets)</li>
              <li>Align next year's financial mission with career consulting growth</li>
            </ul>
          </div>
        </div>
      </div>

      {/* MODAL: Create / Edit Goal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card border border-border-dark rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1">
              {editingGoal ? 'Edit Financial Goal' : 'Create New Financial Goal'}
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              Configure target amount, target completion deadline, and monthly contribution commitment.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-text-secondary block mb-1">Goal Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Emergency Fund (6 Months Buffer)"
                  className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-primary"
                  >
                    <option value="Emergency">Emergency</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Family / Child Future">Family / Child Future</option>
                    <option value="Wealth Creation">Wealth Creation</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Other">Other Goal</option>
                  </select>
                </div>

                <div>
                  <label className="text-text-secondary block mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="180000"
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>
              </div>

              {formData.category === 'Real Estate' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-bg-input/40 rounded-lg border border-purple-500/30">
                  <div>
                    <label className="text-text-secondary block mb-1">Down Payment Goal (₹)</label>
                    <input
                      type="number"
                      value={formData.downPaymentTarget}
                      onChange={(e) => setFormData({ ...formData, downPaymentTarget: e.target.value })}
                      placeholder="1500000"
                      className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary block mb-1">Registration & Stamp Duty (₹)</label>
                    <input
                      type="number"
                      value={formData.registrationCosts}
                      onChange={(e) => setFormData({ ...formData, registrationCosts: e.target.value })}
                      placeholder="400000"
                      className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary block mb-1">Current Allocated Balance (₹)</label>
                  <input
                    type="number"
                    value={formData.currentBalance}
                    onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                    placeholder="80000"
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-text-secondary block mb-1">Monthly Savings Target (₹)</label>
                  <input
                    type="number"
                    value={formData.monthlyTarget}
                    onChange={(e) => setFormData({ ...formData, monthlyTarget: e.target.value })}
                    placeholder="5000"
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary block mb-1">Target Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-text-secondary block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white"
                  >
                    <option value="Not started">Not started</option>
                    <option value="In progress">In progress</option>
                    <option value="On track">On track</option>
                    <option value="At risk">At risk</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Completed">Completed</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-text-secondary block mb-1">Notes & Context</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. 6 months living expense buffer reserved in liquid bank assets"
                  className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border-dark">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-white bg-bg-input rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-lg shadow-md shadow-brand-primary/20"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
