/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { investmentService } from '../services/investmentService';
import toast from 'react-hot-toast';

export const InvestmentContext = createContext(null);

export function InvestmentProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [funds, setFunds] = useState([]);
  const [goals, setGoals] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Selected budget month (default: current YYYY-MM)
  const currentMonthYear = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);

  const fetchInvestmentData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await investmentService.getInvestmentOverview(user.userId);
      setProfile(data.profile || {});
      setFunds(data.funds || []);
      setGoals(data.goals || []);
      setBudgets(data.budgets || []);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load investment planner details');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvestmentData();
  }, [fetchInvestmentData]);

  // Active budget object for selectedMonth
  const activeBudget = useMemo(() => {
    const found = budgets.find(b => b.monthYear === selectedMonth);
    if (found) return found;

    return {
      monthYear: selectedMonth,
      salaryIncome: 65000,
      trainingFreelanceIncome: 10000,
      otherIncome: 0,
      rent: 10500,
      groceries: 12500,
      utilities: 2500,
      transport: 2000,
      parentsSupport: 3000,
      termInsuranceMonthly: 2000,
      healthInsuranceMonthly: 1583,
      healthcare: 1000,
      otherExpenses: 1500,
      actualInvestments: 3000,
      emergencySavings: 5000,
      houseSavings: 5000,
      daughterSavings: 5000,
      notes: ''
    };
  }, [budgets, selectedMonth]);

  // Derived cash flow calculations
  const cashFlow = useMemo(() => {
    return investmentService.calculateCashFlow(activeBudget);
  }, [activeBudget]);

  // Summary statistics
  const summary = useMemo(() => {
    const referenceMonthlyTotal = funds.reduce((sum, f) => sum + (Number(f.referenceSIP) || 0), 0);
    const activeCommitmentsTotal = funds.reduce((sum, f) => sum + (Number(f.activeSIP) || 0), 0);
    const actualMonthlyContributions = funds.reduce((sum, f) => sum + (Number(f.actualThisMonth) || 0), 0);

    const bankSavings = Number(profile?.bankSavings) || 200000;
    const mutualFundHoldings = Number(profile?.mutualFundHoldings) || 170000;
    const emergencyFundBalance = Number(profile?.emergencyFundBalance) || 80000;
    const houseFundBalance = Number(profile?.houseFundBalance) || 70000;
    const daughterFundBalance = Number(profile?.daughterFundBalance) || 50000;
    const monthlySavingsTarget = Number(profile?.monthlySavingsTarget) || 20000;

    return {
      referenceMonthlyTotal,
      activeCommitmentsTotal,
      actualMonthlyContributions,
      bankSavings,
      mutualFundHoldings,
      emergencyFundBalance,
      houseFundBalance,
      daughterFundBalance,
      monthlySavingsTarget,
      remainingCashBalance: cashFlow.availableBalance
    };
  }, [funds, profile, cashFlow.availableBalance]);

  // Mutation handlers
  const updateProfile = async (newProfileData) => {
    if (!user) return;
    try {
      setProfile(prev => ({ ...prev, ...newProfileData }));
      await investmentService.updateProfile(user.userId, newProfileData);
      toast.success('Financial profile updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update financial profile');
    }
  };

  const updateFund = async (fundId, fundData) => {
    if (!user) return;
    try {
      setFunds(prev => prev.map(f => f.id === fundId ? { ...f, ...fundData } : f));
      await investmentService.updateFund(user.userId, fundId, fundData);
      toast.success('Fund details updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update fund');
    }
  };

  const saveBudget = async (budgetData) => {
    if (!user) return;
    try {
      setBudgets(prev => {
        const idx = prev.findIndex(b => b.monthYear === budgetData.monthYear);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...budgetData };
          return updated;
        }
        return [...prev, budgetData];
      });
      await investmentService.saveMonthlyBudget(user.userId, budgetData);
      toast.success('Monthly budget updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save monthly budget');
    }
  };

  const saveGoal = async (goalData) => {
    if (!user) return;
    try {
      const res = await investmentService.saveFinancialGoal(user.userId, goalData);
      if (res.goals) setGoals(res.goals);
      toast.success('Financial goal saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save financial goal');
    }
  };

  const deleteGoal = async (goalId) => {
    if (!user) return;
    try {
      const res = await investmentService.deleteFinancialGoal(user.userId, goalId);
      if (res.goals) setGoals(res.goals);
      toast.success('Goal removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete goal');
    }
  };

  const addTransaction = async (txData) => {
    if (!user) return;
    try {
      await investmentService.addContributionTransaction(user.userId, txData);
      await fetchInvestmentData();
      toast.success('Transaction logged');
    } catch (err) {
      console.error(err);
      toast.error('Failed to log transaction');
    }
  };

  return (
    <InvestmentContext.Provider
      value={{
        profile,
        funds,
        goals,
        budgets,
        transactions,
        activeBudget,
        cashFlow,
        summary,
        selectedMonth,
        setSelectedMonth,
        loading,
        fetchInvestmentData,
        updateProfile,
        updateFund,
        saveBudget,
        saveGoal,
        deleteGoal,
        addTransaction
      }}
    >
      {children}
    </InvestmentContext.Provider>
  );
}
