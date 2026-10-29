/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { InvestmentContext } from './InvestmentContext';
import { DashboardContext } from './DashboardContext';
import { taskService } from '../services/taskService';
import { calculatePriorityScore } from '../utils/priorityEngine';
import toast from 'react-hot-toast';

export const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const { user } = useContext(AuthContext);
  const investment = useContext(InvestmentContext);
  const dashboard = useContext(DashboardContext);
  const goals = investment?.goals || [];
  const opportunities = dashboard?.opportunities || [];

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('priority'); // 'priority', 'dueDate', 'title', 'created'
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchTasks = useCallback(async (filters = {}) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await taskService.getTasks(user.userId, filters);
      setTasks(data || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (taskData) => {
    if (!user) return;
    try {
      const newTask = await taskService.saveTask(user.userId, taskData);
      setTasks((prev) => [newTask, ...prev.filter(t => t.taskId !== newTask.taskId)]);
      toast.success('Task created successfully');
      return newTask;
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create task');
      throw err;
    }
  };

  const updateTask = async (taskData) => {
    if (!user) return;
    try {
      const updated = await taskService.saveTask(user.userId, taskData);
      setTasks((prev) => prev.map((t) => (t.taskId === updated.taskId ? updated : t)));
      toast.success('Task updated');
      return updated;
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update task');
      throw err;
    }
  };

  const removeTask = async (taskId) => {
    if (!user) return;
    try {
      await taskService.deleteTask(user.userId, taskId);
      setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
      toast.success('Task deleted');
      return true;
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to delete task');
      throw err;
    }
  };

  const toggleTaskComplete = async (taskId) => {
    const existing = tasks.find(t => t.taskId === taskId);
    if (!existing) return;

    const nextStatus = existing.status === 'Completed' ? 'In Progress' : 'Completed';
    // Optimistic update
    setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, status: nextStatus } : t));

    try {
      await updateTask({ ...existing, status: nextStatus });
    } catch (err) {
      console.error(err);
      // Rollback optimistic update
      setTasks(prev => prev.map(t => t.taskId === taskId ? existing : t));
    }
  };

  // Enrich tasks with deterministic priority score calculation
  const enrichedTasks = useMemo(() => {
    return tasks.map(task => {
      const priorityInfo = calculatePriorityScore(task, tasks, goals, opportunities);
      return {
        ...task,
        priorityScore: priorityInfo.score,
        priorityBand: priorityInfo.band,
        isManualOverride: priorityInfo.isManualOverride,
        scoreBreakdown: priorityInfo.breakdown,
        scoreSummary: priorityInfo.summary
      };
    });
  }, [tasks, goals, opportunities]);

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    const filtered = enrichedTasks.filter(task => {
      // Category filter
      if (selectedCategory !== 'All' && task.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'All' && task.status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        const matchesProject = (task.projectArea || '').toLowerCase().includes(query);
        const matchesNextAction = (task.nextAction || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesProject && !matchesNextAction) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      // Completed tasks always pushed to bottom unless specifically filtering by Completed
      if (selectedStatus !== 'Completed') {
        if (a.status === 'Completed' && b.status !== 'Completed') return 1;
        if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      }

      if (sortBy === 'priority') {
        const scoreDiff = b.priorityScore - a.priorityScore;
        return sortOrder === 'desc' ? scoreDiff : -scoreDiff;
      }

      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return sortOrder === 'desc'
          ? b.dueDate.localeCompare(a.dueDate)
          : a.dueDate.localeCompare(b.dueDate);
      }

      if (sortBy === 'title') {
        return sortOrder === 'desc'
          ? b.title.localeCompare(a.title)
          : a.title.localeCompare(b.title);
      }

      // Default: created timestamp
      return sortOrder === 'desc'
        ? (b.createdAt || '').localeCompare(a.createdAt || '')
        : (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }, [enrichedTasks, selectedCategory, selectedStatus, searchQuery, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const planned = tasks.filter(t => t.status === 'Planned' || t.status === 'Inbox').length;
    const blocked = tasks.filter(t => t.status === 'Blocked').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Critical priority items needing today's attention
    const criticalCount = enrichedTasks.filter(t => t.status !== 'Completed' && t.priorityScore >= 80).length;

    return { total, completed, inProgress, planned, blocked, completionRate, criticalCount };
  }, [tasks, enrichedTasks]);

  return (
    <TaskContext.Provider
      value={{
        tasks: enrichedTasks,
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
        sortOrder,
        setSortOrder,
        fetchTasks,
        createTask,
        updateTask,
        removeTask,
        toggleTaskComplete
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}
