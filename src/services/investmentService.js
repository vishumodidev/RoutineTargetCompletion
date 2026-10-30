import api from './api.js';
import { mockDb } from '../utils/mockDb.js';

const isSheetsEnabled = typeof import.meta !== 'undefined' && !!import.meta?.env?.VITE_API_URL;

export const formatINR = (value) => {
  const num = Number(value) || 0;
  return '₹' + num.toLocaleString('en-IN');
};

export const investmentService = {
  getInvestmentOverview: async (userId) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.get('', { params: { action: 'investmentOverview', userId } });
        if (res.data && res.data.success) return res.data;
      } catch (err) {
        console.warn('Sheets API unavailable for investmentOverview, using local store:', err.message);
      }
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.getInvestmentOverview(userId));
      }, 250);
    });
  },

  updateProfile: async (userId, profileData) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'updateInvestmentProfile', userId, profileData });
        if (res.data && res.data.success) return res.data;
      } catch (err) {
        console.warn('Sheets API fallback:', err.message);
      }
    }
    return mockDb.updateInvestmentProfile(userId, profileData);
  },

  updateFund: async (userId, fundId, fundData) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'updateInvestmentFund', userId, fundId, fundData });
        if (res.data && res.data.success) return res.data;
      } catch (err) {
        console.warn('Sheets API fallback:', err.message);
      }
    }
    return mockDb.updateInvestmentFund(userId, fundId, fundData);
  },

  getMonthlyBudget: async (userId, monthYear) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.get('', { params: { action: 'monthlyBudget', userId, monthYear } });
        if (res.data && res.data.success) return res.data;
      } catch (err) {
        console.warn('Sheets API fallback:', err.message);
      }
    }
    return mockDb.getMonthlyBudget(userId, monthYear);
  },

  saveMonthlyBudget: async (userId, budgetData) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'saveMonthlyBudget', userId, budgetData });
        if (res.data && res.data.success) return res.data;
      } catch (err) {
        console.warn('Sheets API fallback:', err.message);
      }
    }
    return mockDb.saveMonthlyBudget(userId, budgetData);
  },

  saveFinancialGoal: async (userId, goalData) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'saveFinancialGoal', userId, goalData });
        if (res.data && res.data.success) return res.data;
      } catch (err) {
        console.warn('Sheets API fallback:', err.message);
      }
    }
    return mockDb.saveFinancialGoal(userId, goalData);
  },

  deleteFinancialGoal: async (userId, goalId) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'deleteFinancialGoal', userId, goalId });
        if (res.data && res.data.success) return res.data;
      } catch (err) {
        console.warn('Sheets API fallback:', err.message);
      }
    }
    return mockDb.deleteFinancialGoal(userId, goalId);
  },

  addContributionTransaction: async (userId, txData) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'addContributionTransaction', userId, txData });
        if (res.data && res.data.success) return res.data;
      } catch (err) {
        console.warn('Sheets API fallback:', err.message);
      }
    }
    return mockDb.addContributionTransaction(userId, txData);
  },

  // Calculate detailed monthly cash flow
  calculateCashFlow: (budget) => {
    const salary = Number(budget.salaryIncome) || 0;
    const training = Number(budget.trainingFreelanceIncome) || 0;
    const otherInc = Number(budget.otherIncome) || 0;
    const totalIncome = salary + training + otherInc;

    const rent = Number(budget.rent) || 0;
    const groceries = Number(budget.groceries) || 0;
    const utilities = Number(budget.utilities) || 0;
    const transport = Number(budget.transport) || 0;
    const parents = Number(budget.parentsSupport) || 0;
    const healthcare = Number(budget.healthcare) || 0;
    const otherExp = Number(budget.otherExpenses) || 0;
    const totalLivingExpenses = rent + groceries + utilities + transport + parents + healthcare + otherExp;

    const termIns = Number(budget.termInsuranceMonthly) || 0;
    const healthIns = Number(budget.healthInsuranceMonthly) || 0;
    const totalInsuranceProvisions = termIns + healthIns;

    const actualInvestments = Number(budget.actualInvestments) || 0;

    const emergencySav = Number(budget.emergencySavings) || 0;
    const houseSav = Number(budget.houseSavings) || 0;
    const daughterSav = Number(budget.daughterSavings) || 0;
    const totalGoalSavings = emergencySav + houseSav + daughterSav;

    const totalOutflows = totalLivingExpenses + totalInsuranceProvisions + actualInvestments + totalGoalSavings;
    const availableBalance = totalIncome - totalOutflows;

    return {
      totalIncome,
      totalLivingExpenses,
      totalInsuranceProvisions,
      actualInvestments,
      totalGoalSavings,
      totalOutflows,
      availableBalance,
      isDeficit: availableBalance < 0
    };
  },

  // Export dataset to CSV
  exportToCsv: (rows, filename = 'financial-data.csv') => {
    if (!rows || !rows.length) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(fieldName => {
        const val = row[fieldName] !== undefined ? String(row[fieldName]).replace(/"/g, '""') : '';
        return `"${val}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
