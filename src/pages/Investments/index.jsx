import { useContext, useState, useMemo } from 'react';
import { InvestmentContext } from '../../context/InvestmentContext';
import { AuthContext } from '../../context/AuthContext';
import { formatINR, investmentService } from '../../services/investmentService';
import { 
  Landmark, 
  TrendingUp, 
  Wallet, 
  ShieldCheck, 
  AlertTriangle, 
  Plus, 
  Download, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Calendar, 
  DollarSign, 
  Layers, 
  PiggyBank, 
  Home, 
  HeartHandshake, 
  Briefcase, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function Investments() {
  const { user } = useContext(AuthContext);
  const { 
    profile, 
    funds, 
    activeBudget, 
    cashFlow, 
    summary, 
    transactions, 
    selectedMonth, 
    setSelectedMonth, 
    updateProfile, 
    updateFund, 
    saveBudget, 
    addTransaction 
  } = useContext(InvestmentContext);

  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    monthlyIncomeMin: 60000,
    monthlyIncomeMax: 80000,
    bankSavings: 200000,
    mutualFundHoldings: 170000,
    monthlySavingsTarget: 20000
  });

  const [showTxModal, setShowTxModal] = useState(false);
  const [txForm, setTxForm] = useState({
    category: 'Mutual Fund',
    entityName: 'SBI Small Cap Active SIP',
    amount: '',
    paymentMode: 'Auto-Debit',
    notes: ''
  });

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({});

  // Sync profile form when opening modal
  const handleOpenProfileModal = () => {
    if (profile) {
      setProfileForm({
        monthlyIncomeMin: profile.monthlyIncomeMin || 60000,
        monthlyIncomeMax: profile.monthlyIncomeMax || 80000,
        bankSavings: profile.bankSavings || 200000,
        mutualFundHoldings: profile.mutualFundHoldings || 170000,
        monthlySavingsTarget: profile.monthlySavingsTarget || 20000
      });
    }
    setShowProfileModal(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({
      monthlyIncomeMin: Number(profileForm.monthlyIncomeMin),
      monthlyIncomeMax: Number(profileForm.monthlyIncomeMax),
      bankSavings: Number(profileForm.bankSavings),
      mutualFundHoldings: Number(profileForm.mutualFundHoldings),
      monthlySavingsTarget: Number(profileForm.monthlySavingsTarget)
    });
    setShowProfileModal(false);
  };

  // Start editing budget
  const handleStartEditBudget = () => {
    setBudgetForm({ ...activeBudget });
    setIsEditingBudget(true);
  };

  const handleSaveBudget = (e) => {
    e.preventDefault();
    saveBudget({
      ...activeBudget,
      ...budgetForm,
      salaryIncome: Number(budgetForm.salaryIncome) || 0,
      trainingFreelanceIncome: Number(budgetForm.trainingFreelanceIncome) || 0,
      otherIncome: Number(budgetForm.otherIncome) || 0,
      rent: Number(budgetForm.rent) || 0,
      groceries: Number(budgetForm.groceries) || 0,
      utilities: Number(budgetForm.utilities) || 0,
      transport: Number(budgetForm.transport) || 0,
      parentsSupport: Number(budgetForm.parentsSupport) || 0,
      termInsuranceMonthly: Number(budgetForm.termInsuranceMonthly) || 0,
      healthInsuranceMonthly: Number(budgetForm.healthInsuranceMonthly) || 0,
      healthcare: Number(budgetForm.healthcare) || 0,
      otherExpenses: Number(budgetForm.otherExpenses) || 0,
      actualInvestments: Number(budgetForm.actualInvestments) || 0,
      emergencySavings: Number(budgetForm.emergencySavings) || 0,
      houseSavings: Number(budgetForm.houseSavings) || 0,
      daughterSavings: Number(budgetForm.daughterSavings) || 0
    });
    setIsEditingBudget(false);
  };

  const handleAddTxSubmit = (e) => {
    e.preventDefault();
    if (!txForm.amount || Number(txForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    addTransaction({
      ...txForm,
      amount: Number(txForm.amount),
      date: new Date().toISOString().split('T')[0]
    });
    setShowTxModal(false);
    setTxForm({
      category: 'Mutual Fund',
      entityName: 'SBI Small Cap Active SIP',
      amount: '',
      paymentMode: 'Auto-Debit',
      notes: ''
    });
  };

  // Export transactions to CSV
  const handleExportCSV = () => {
    if (!transactions.length) {
      toast.error('No transactions available to export');
      return;
    }
    investmentService.exportToCsv(transactions, `Investment_Transactions_${selectedMonth}.csv`);
    toast.success('Transaction history exported as CSV');
  };

  // Chart data: Planned vs Actual
  const plannedVsActualData = useMemo(() => {
    return [
      {
        name: 'Mutual Funds',
        ReferencePlan: summary.referenceMonthlyTotal,
        ActiveCommitment: summary.activeCommitmentsTotal,
        ActualContributed: summary.actualMonthlyContributions
      },
      {
        name: 'Total Monthly Savings',
        ReferencePlan: summary.monthlySavingsTarget,
        ActiveCommitment: cashFlow.totalGoalSavings,
        ActualContributed: cashFlow.totalGoalSavings
      }
    ];
  }, [summary, cashFlow]);

  // Outflows breakdown for PieChart
  const outflowPieData = useMemo(() => {
    return [
      { name: 'Rent', value: Number(activeBudget.rent) || 0 },
      { name: 'Groceries', value: Number(activeBudget.groceries) || 0 },
      { name: 'Utilities & Bills', value: Number(activeBudget.utilities) || 0 },
      { name: 'Parents Support', value: Number(activeBudget.parentsSupport) || 0 },
      { name: 'Insurance Provisions', value: (Number(activeBudget.termInsuranceMonthly) || 0) + (Number(activeBudget.healthInsuranceMonthly) || 0) },
      { name: 'Mutual Funds (SIP)', value: Number(activeBudget.actualInvestments) || 0 },
      { name: 'Goal Savings', value: cashFlow.totalGoalSavings },
      { name: 'Transport & Healthcare', value: (Number(activeBudget.transport) || 0) + (Number(activeBudget.healthcare) || 0) + (Number(activeBudget.otherExpenses) || 0) }
    ].filter(item => item.value > 0);
  }, [activeBudget, cashFlow.totalGoalSavings]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border-dark pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-primary">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Investment Planner & Financial OS
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                  Verified Reference Blueprint
                </span>
              </h1>
              <p className="text-xs text-text-secondary mt-0.5">
                Integrated financial budgeting, reference mutual fund allocations, and goal-directed capital preservation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Month selector */}
          <div className="flex items-center bg-bg-card border border-border-dark rounded-lg px-3 py-1.5 text-xs text-text-primary">
            <Calendar className="h-3.5 w-3.5 mr-2 text-brand-primary" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-0 focus:outline-none text-white text-xs font-semibold cursor-pointer"
            />
          </div>

          <button
            onClick={handleOpenProfileModal}
            className="flex items-center px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-white bg-bg-card hover:bg-bg-input border border-border-dark rounded-lg transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
            Edit Profile Baseline
          </button>

          <button
            onClick={() => setShowTxModal(true)}
            className="flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-lg transition-colors shadow-lg shadow-brand-primary/20"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Record Contribution
          </button>
        </div>
      </div>

      {/* Cash Flow Deficit Warning Alert */}
      {cashFlow.isDeficit && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-sm text-rose-200">Budget Deficit Warning</p>
            <p className="mt-0.5">
              Planned financial commitments exceed confirmed received income by <span className="font-bold text-white">{formatINR(Math.abs(cashFlow.availableBalance))}</span>.
              Review your discretionary allocations or adjust savings targets until confirmed revenues materialize.
            </p>
          </div>
        </div>
      )}

      {/* Safety Principle Banner */}
      <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-200 text-xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Info className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>
            <strong>Reference Plan vs Actual Commitment:</strong> ₹20,000/mo is your reference target allocation. Your active active SIP commitment is strictly <strong>₹3,000/mo (SBI Small Cap)</strong>. The remaining four funds remain on hold.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 uppercase tracking-wider">
          Read-Only Automation
        </span>
      </div>

      {/* Section 1: Top Financial KPI Cards (10 Summary Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Reference Monthly Allocation */}
        <div className="bg-bg-card border border-border-dark p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Reference Plan</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-amber-400">{formatINR(summary.referenceMonthlyTotal)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">Monthly allocation goal</p>
          </div>
          <span className="text-[10px] font-semibold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded mt-2 text-center">
            Reference Only
          </span>
        </div>

        {/* 2. Actual Active SIP Commitments */}
        <div className="bg-bg-card border border-brand-primary/30 p-4 rounded-xl flex flex-col justify-between bg-gradient-to-br from-brand-primary/5 to-transparent">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Active Commitments</span>
            <TrendingUp className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-brand-primary">{formatINR(summary.activeCommitmentsTotal)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">SBI Small Cap SIP only</p>
          </div>
          <span className="text-[10px] font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded mt-2 text-center">
            Active Auto-Debit
          </span>
        </div>

        {/* 3. Actual Monthly Contributions */}
        <div className="bg-bg-card border border-border-dark p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Actual Contributed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-emerald-400">{formatINR(summary.actualMonthlyContributions)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">Invested this month</p>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded mt-2 text-center">
            100% of Active SIP
          </span>
        </div>

        {/* 4. Monthly Savings Target */}
        <div className="bg-bg-card border border-border-dark p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Savings Target</span>
            <PiggyBank className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-white">{formatINR(summary.monthlySavingsTarget)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">Emergency + House + Child</p>
          </div>
          <span className="text-[10px] font-semibold text-text-secondary bg-bg-input px-2 py-0.5 rounded mt-2 text-center">
            Target per Month
          </span>
        </div>

        {/* 5. Actual Savings */}
        <div className="bg-bg-card border border-border-dark p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Actual Savings</span>
            <Wallet className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-cyan-400">{formatINR(cashFlow.totalGoalSavings)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">Allocated this month</p>
          </div>
          <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded mt-2 text-center">
            75% of target
          </span>
        </div>

        {/* 6. Emergency Fund Balance */}
        <div className="bg-bg-card border border-border-dark p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Emergency Fund</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-white">{formatINR(summary.emergencyFundBalance)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">Target: ₹1,80,000 (6 Mo)</p>
          </div>
          <div className="w-full bg-bg-input h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-400 h-full" style={{ width: `${Math.min(100, (summary.emergencyFundBalance / 180000) * 100)}%` }} />
          </div>
        </div>

        {/* 7. House Fund Balance */}
        <div className="bg-bg-card border border-border-dark p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>House Fund 2033</span>
            <Home className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-white">{formatINR(summary.houseFundBalance)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">Target: ₹15L Down payment</p>
          </div>
          <div className="w-full bg-bg-input h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-purple-400 h-full" style={{ width: `${Math.min(100, (summary.houseFundBalance / 1500000) * 100)}%` }} />
          </div>
        </div>

        {/* 8. Daughter's Future Fund */}
        <div className="bg-bg-card border border-border-dark p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Daughter's Fund</span>
            <HeartHandshake className="h-4 w-4 text-pink-400" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-white">{formatINR(summary.daughterFundBalance)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">Long-term education</p>
          </div>
          <div className="w-full bg-bg-input h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-pink-400 h-full" style={{ width: `${Math.min(100, (summary.daughterFundBalance / 2500000) * 100)}%` }} />
          </div>
        </div>

        {/* 9. Remaining Cash Balance */}
        <div className={`bg-bg-card border p-4 rounded-xl flex flex-col justify-between ${cashFlow.availableBalance >= 0 ? 'border-border-dark' : 'border-rose-500/40 bg-rose-500/5'}`}>
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Remaining Cash</span>
            <DollarSign className={`h-4 w-4 ${cashFlow.availableBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className="mt-2">
            <p className={`text-lg font-black ${cashFlow.availableBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatINR(cashFlow.availableBalance)}
            </p>
            <p className="text-[10px] text-text-secondary mt-0.5">Unallocated surplus</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded mt-2 text-center ${cashFlow.availableBalance >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
            {cashFlow.availableBalance >= 0 ? 'Surplus Available' : 'Deficit Alert'}
          </span>
        </div>

        {/* 10. Total Bank + MF Baseline Holdings */}
        <div className="bg-bg-card border border-border-dark p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Total Net Assets</span>
            <Briefcase className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-white">
              {formatINR(summary.bankSavings + summary.mutualFundHoldings)}
            </p>
            <p className="text-[10px] text-text-secondary mt-0.5">Bank ₹2L + MF ₹1.7L</p>
          </div>
          <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded mt-2 text-center">
            Reported Baseline
          </span>
        </div>
      </div>

      {/* Section 2: Reference Investment Plan Table (Exact Blueprint) */}
      <div className="bg-bg-card border border-border-dark rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 md:p-6 border-b border-border-dark flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-brand-primary" />
              Reference Investment Plan (₹20,000 Allocation Blueprint)
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Preserved reference monthly allocation. Four funds are on hold; only SBI Small Cap is active at ₹3,000/month.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">
              Reference: {formatINR(summary.referenceMonthlyTotal)}
            </span>
            <span className="px-2.5 py-1 rounded bg-brand-primary/20 border border-brand-primary/40 text-brand-primary font-bold">
              Active Commitment: {formatINR(summary.activeCommitmentsTotal)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-input/60 text-text-secondary uppercase text-[10px] tracking-wider border-b border-border-dark">
              <tr>
                <th className="py-3 px-4">Mutual Fund Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Reference SIP</th>
                <th className="py-3 px-4">Active Commitment</th>
                <th className="py-3 px-4">Actual Contributed</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Mandatory Instruction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-text-primary">
              {funds.map((fund) => {
                const isActive = fund.status === 'Active';
                return (
                  <tr key={fund.id} className="hover:bg-bg-input/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center">
                      <div className={`h-2 w-2 rounded-full mr-2.5 ${isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {fund.name}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">{fund.category}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-text-primary">
                      {formatINR(fund.referenceSIP)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {isActive ? (
                        <span className="text-brand-primary">{formatINR(fund.activeSIP)}</span>
                      ) : (
                        <span className="text-text-secondary">₹0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {isActive ? (
                        <span className="text-emerald-400">{formatINR(fund.actualThisMonth)}</span>
                      ) : (
                        <span className="text-text-secondary">₹0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                          On Hold
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {fund.instruction}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-bg-input/40 border-t border-border-dark font-bold text-white">
              <tr>
                <td className="py-3 px-4">Total Reference Plan</td>
                <td className="py-3 px-4 text-text-secondary">5 Funds</td>
                <td className="py-3 px-4 text-amber-400 font-mono text-sm">{formatINR(summary.referenceMonthlyTotal)}</td>
                <td className="py-3 px-4 text-brand-primary font-mono text-sm">{formatINR(summary.activeCommitmentsTotal)}</td>
                <td className="py-3 px-4 text-emerald-400 font-mono text-sm">{formatINR(summary.actualMonthlyContributions)}</td>
                <td colSpan="2" className="py-3 px-4 text-xs text-text-secondary font-normal">
                  *SBI Small Cap active at ₹3,000; remaining ₹18,000 on hold.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Section 3: Monthly Budget & Cash-Flow Planner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Ledger */}
        <div className="lg:col-span-2 bg-bg-card border border-border-dark rounded-xl p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border-dark pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-cyan-400" />
                Monthly Cash Flow Ledger ({selectedMonth})
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Calculate confirmed cash-in against living expenses, insurance provisions, and actual investments.
              </p>
            </div>
            {!isEditingBudget ? (
              <button
                onClick={handleStartEditBudget}
                className="flex items-center px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-white bg-bg-input hover:bg-border-dark rounded-lg transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Edit Budget
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditingBudget(false)}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-white bg-bg-input rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBudget}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-lg"
                >
                  Save Budget
                </button>
              </div>
            )}
          </div>

          {/* Budget Categories */}
          <div className="space-y-4 text-xs">
            {/* Inflows Section */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                <span className="flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Cash Inflows (Received / Confirmed)
                </span>
                <span>{formatINR(cashFlow.totalIncome)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-bg-input/40 p-3 rounded-lg border border-border-dark/60">
                <div>
                  <label className="text-[11px] text-text-secondary block">Salary Income</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.salaryIncome}
                      onChange={(e) => setBudgetForm({ ...budgetForm, salaryIncome: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.salaryIncome)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block">Training & Consulting</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.trainingFreelanceIncome}
                      onChange={(e) => setBudgetForm({ ...budgetForm, trainingFreelanceIncome: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.trainingFreelanceIncome)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block">Other Income</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.otherIncome}
                      onChange={(e) => setBudgetForm({ ...budgetForm, otherIncome: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.otherIncome)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Living Outflows Section */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                <span className="flex items-center">
                  <ArrowDownRight className="h-4 w-4 mr-1 text-rose-400" />
                  Monthly Living Expenses
                </span>
                <span className="text-rose-400">{formatINR(cashFlow.totalLivingExpenses)}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-bg-input/40 p-3 rounded-lg border border-border-dark/60">
                <div>
                  <label className="text-[11px] text-text-secondary block">Rent (Fixed)</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.rent}
                      onChange={(e) => setBudgetForm({ ...budgetForm, rent: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.rent)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block">Groceries (₹10k–15k)</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.groceries}
                      onChange={(e) => setBudgetForm({ ...budgetForm, groceries: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.groceries)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block">Parents Support</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.parentsSupport}
                      onChange={(e) => setBudgetForm({ ...budgetForm, parentsSupport: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.parentsSupport)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block">Utilities & Bills</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.utilities}
                      onChange={(e) => setBudgetForm({ ...budgetForm, utilities: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.utilities)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block">Transport</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.transport}
                      onChange={(e) => setBudgetForm({ ...budgetForm, transport: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.transport)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block">Healthcare</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.healthcare}
                      onChange={(e) => setBudgetForm({ ...budgetForm, healthcare: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.healthcare)}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-text-secondary block">Other / Misc Expenses</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.otherExpenses}
                      onChange={(e) => setBudgetForm({ ...budgetForm, otherExpenses: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.otherExpenses)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Annual Insurance Provisions Section */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                <span className="flex items-center">
                  <ShieldCheck className="h-4 w-4 mr-1 text-amber-400" />
                  Insurance Monthly Accruals (Annual Premiums)
                </span>
                <span>{formatINR(cashFlow.totalInsuranceProvisions)}/mo</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-bg-input/40 p-3 rounded-lg border border-border-dark/60">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-text-secondary">Term Insurance (₹24,000/yr)</label>
                    <span className="text-[10px] text-amber-400 font-mono">₹2,000/mo</span>
                  </div>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.termInsuranceMonthly}
                      onChange={(e) => setBudgetForm({ ...budgetForm, termInsuranceMonthly: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.termInsuranceMonthly)}</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-text-secondary">Health Insurance (₹19,000/yr)</label>
                    <span className="text-[10px] text-amber-400 font-mono">₹1,583/mo</span>
                  </div>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.healthInsuranceMonthly}
                      onChange={(e) => setBudgetForm({ ...budgetForm, healthInsuranceMonthly: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.healthInsuranceMonthly)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Investments & Goal Savings Section */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-brand-primary uppercase tracking-wider mb-2">
                <span className="flex items-center">
                  <PiggyBank className="h-4 w-4 mr-1" />
                  Investments & Goal Savings Allocations
                </span>
                <span>{formatINR(Number(activeBudget.actualInvestments) + cashFlow.totalGoalSavings)}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-bg-input/40 p-3 rounded-lg border border-border-dark/60">
                <div>
                  <label className="text-[11px] text-brand-primary font-semibold block">SBI Small Cap SIP</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.actualInvestments}
                      onChange={(e) => setBudgetForm({ ...budgetForm, actualInvestments: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-brand-primary mt-0.5">{formatINR(activeBudget.actualInvestments)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block">Emergency Fund</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.emergencySavings}
                      onChange={(e) => setBudgetForm({ ...budgetForm, emergencySavings: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.emergencySavings)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block">House Fund 2033</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.houseSavings}
                      onChange={(e) => setBudgetForm({ ...budgetForm, houseSavings: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.houseSavings)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block">Daughter's Fund</label>
                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetForm.daughterSavings}
                      onChange={(e) => setBudgetForm({ ...budgetForm, daughterSavings: e.target.value })}
                      className="w-full bg-bg-dark border border-border-dark rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">{formatINR(activeBudget.daughterSavings)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flow Summary Footer */}
          <div className="mt-5 pt-4 border-t border-border-dark flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-bg-dark/50 p-4 rounded-xl">
            <div>
              <p className="text-xs text-text-secondary">Cash Flow Equation</p>
              <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                Income ({formatINR(cashFlow.totalIncome)}) − Outflows ({formatINR(cashFlow.totalOutflows)})
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-secondary">Monthly Surplus / Available:</span>
              <p className={`text-xl font-black ${cashFlow.availableBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatINR(cashFlow.availableBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Expense Distribution & Visual Insights */}
        <div className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-brand-primary" />
              Monthly Outflow Allocation
            </h3>
            <p className="text-xs text-text-secondary mb-3">Breakdown of committed capital for {selectedMonth}</p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outflowPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {outflowPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => formatINR(val)}
                    contentStyle={{ backgroundColor: '#151b2c', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 mt-2">
              {outflowPieData.slice(0, 5).map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 truncate">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-text-secondary truncate">{item.name}</span>
                  </div>
                  <span className="font-mono text-white font-semibold">{formatINR(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-dark/80 text-[11px] text-text-secondary">
            <div className="flex items-center justify-between mb-1">
              <span>Savings Rate:</span>
              <span className="font-bold text-emerald-400">
                {cashFlow.totalIncome > 0 ? Math.round(((Number(activeBudget.actualInvestments) + cashFlow.totalGoalSavings) / cashFlow.totalIncome) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Essential Expense Ratio:</span>
              <span className="font-bold text-white">
                {cashFlow.totalIncome > 0 ? Math.round((cashFlow.totalLivingExpenses / cashFlow.totalIncome) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Planned Reference vs Actual Commitments Bar Chart */}
      <div className="bg-bg-card border border-border-dark rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              Planned vs Actual Investment Comparison
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Clear distinction between reference design targets, active auto-debit commitments, and actual deposits.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <div className="h-3 w-3 rounded bg-amber-400" />
              <span className="text-text-secondary">Reference Target (₹20,000)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="h-3 w-3 rounded bg-brand-primary" />
              <span className="text-text-secondary">Active Commitment (₹3,000)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="h-3 w-3 rounded bg-emerald-400" />
              <span className="text-text-secondary">Actual Contributed (₹3,000)</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={plannedVsActualData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip 
                formatter={(val) => formatINR(val)}
                contentStyle={{ backgroundColor: '#151b2c', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
              />
              <Bar dataKey="ReferencePlan" fill="#f59e0b" name="Reference Blueprint" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ActiveCommitment" fill="#6366f1" name="Active SIP Commitment" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ActualContributed" fill="#10b981" name="Actual Contributed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 5: Historical Transactions & Contribution Ledger */}
      <div className="bg-bg-card border border-border-dark rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 md:p-6 border-b border-border-dark flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-400" />
              Recent Contribution Transactions & Audit Trail
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Verified records of actual investments, emergency deposits, and house fund contributions.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-white bg-bg-input hover:bg-border-dark rounded-lg transition-colors border border-border-dark"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-brand-primary" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-input/60 text-text-secondary uppercase text-[10px] tracking-wider border-b border-border-dark">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Entity / Asset</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-text-primary">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-bg-input/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-text-secondary">{tx.date}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-bg-input text-text-secondary">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{tx.entityName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatINR(tx.amount)}</td>
                    <td className="py-3 px-4 text-text-secondary">{tx.type}</td>
                    <td className="py-3 px-4 text-text-secondary">{tx.paymentMode}</td>
                    <td className="py-3 px-4 text-text-secondary">{tx.notes || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-text-secondary">
                    No transactions recorded yet. Click "Record Contribution" above to log a deposit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Contribution */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card border border-border-dark rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Record Financial Contribution</h3>
            <p className="text-xs text-text-secondary mb-4">
              Log an actual mutual fund SIP, emergency savings deposit, or house fund allocation.
            </p>

            <form onSubmit={handleAddTxSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-text-secondary block mb-1">Contribution Category</label>
                <select
                  value={txForm.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    let defaultEntity = 'SBI Small Cap Active SIP';
                    if (cat === 'Emergency Fund') defaultEntity = 'Emergency Savings Allocation';
                    if (cat === 'House Fund') defaultEntity = 'House 2033 Target Allocation';
                    if (cat === "Daughter's Fund") defaultEntity = "Daughter's Future Allocation";
                    setTxForm({ ...txForm, category: cat, entityName: defaultEntity });
                  }}
                  className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-primary"
                >
                  <option value="Mutual Fund">Mutual Fund (Active SIP)</option>
                  <option value="Emergency Fund">Emergency Fund</option>
                  <option value="House Fund">House Purchase 2033</option>
                  <option value="Daughter's Fund">Daughter's Future Fund</option>
                  <option value="Other Savings">Other Dedicated Savings</option>
                </select>
              </div>

              <div>
                <label className="text-text-secondary block mb-1">Entity / Goal Name</label>
                <input
                  type="text"
                  value={txForm.entityName}
                  onChange={(e) => setTxForm({ ...txForm, entityName: e.target.value })}
                  className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    placeholder="3000"
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-text-secondary block mb-1">Payment Mode</label>
                  <select
                    value={txForm.paymentMode}
                    onChange={(e) => setTxForm({ ...txForm, paymentMode: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-primary"
                  >
                    <option value="Auto-Debit">Auto-Debit</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI / NetBanking</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-text-secondary block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={txForm.notes}
                  onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                  placeholder="e.g., Monthly auto-debit executed"
                  className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border-dark">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-white bg-bg-input rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-lg shadow-md shadow-brand-primary/20"
                >
                  Save Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Financial Profile Baseline */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card border border-border-dark rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Edit Financial Profile Baseline</h3>
            <p className="text-xs text-text-secondary mb-4">
              These are your reported baseline benchmarks. Updating them does not alter your bank balances.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary block mb-1">Income Planning Min (₹)</label>
                  <input
                    type="number"
                    value={profileForm.monthlyIncomeMin}
                    onChange={(e) => setProfileForm({ ...profileForm, monthlyIncomeMin: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-text-secondary block mb-1">Income Planning Max (₹)</label>
                  <input
                    type="number"
                    value={profileForm.monthlyIncomeMax}
                    onChange={(e) => setProfileForm({ ...profileForm, monthlyIncomeMax: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary block mb-1">Reported Bank Savings (₹)</label>
                  <input
                    type="number"
                    value={profileForm.bankSavings}
                    onChange={(e) => setProfileForm({ ...profileForm, bankSavings: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-text-secondary block mb-1">Reported MF Holdings (₹)</label>
                  <input
                    type="number"
                    value={profileForm.mutualFundHoldings}
                    onChange={(e) => setProfileForm({ ...profileForm, mutualFundHoldings: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-text-secondary block mb-1">Monthly Savings Target (₹)</label>
                <input
                  type="number"
                  value={profileForm.monthlySavingsTarget}
                  onChange={(e) => setProfileForm({ ...profileForm, monthlySavingsTarget: e.target.value })}
                  className="w-full bg-bg-input border border-border-dark rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border-dark">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-white bg-bg-input rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-lg"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
