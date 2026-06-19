import { mockDb } from '../utils/mockDb';
import api from './api';

const isSheetsEnabled = !!import.meta.env.VITE_API_URL;

export const ROUTINE_TEMPLATES = {
  weekday: [
    { id: 'w_wake', time: '05:30 AM', duration: 0.25, activity: 'Wake up, water, freshen up', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_cycling', time: '05:45 AM – 06:45 AM', duration: 1.0, activity: 'Cycling (Cardio)', category: 'Health', xpReward: 15 },
    { id: 'w_yoga', time: '06:45 AM – 07:45 AM', duration: 1.0, activity: 'Yoga, Exercise & Meditation', category: 'Health', xpReward: 15 },
    { id: 'w_bath', time: '07:45 AM – 08:15 AM', duration: 0.5, activity: 'Freshen Up & Shower', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_breakfast', time: '08:15 AM – 08:45 AM', duration: 0.5, activity: 'Breakfast (Healthy meal)', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_mi_morning', time: '08:45 AM – 09:30 AM', duration: 0.75, activity: 'Mi Lifestyle follow-ups & customer responses', category: 'Mi Lifestyle', xpReward: 10 },
    { id: 'w_prep', time: '09:30 AM – 10:00 AM', duration: 0.5, activity: 'Commute & Office preparation', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_office_1', time: '10:00 AM – 11:00 AM', duration: 1.0, activity: 'Office Work: Core Backlog', category: 'Job/Office', xpReward: 10 },
    { id: 'w_office_learn', time: '11:00 AM – 12:00 PM', duration: 1.0, activity: 'Skill Upgrade: AI Learning / Python / Architecture', category: 'Training & AI', xpReward: 15 },
    { id: 'w_office_2', time: '12:00 PM – 01:00 PM', duration: 1.0, activity: 'Office Work: Technical Deliverables', category: 'Job/Office', xpReward: 10 },
    { id: 'w_lunch', time: '01:00 PM – 02:00 PM', duration: 1.0, activity: 'Lunch & Cognitive Recharge', category: 'Family/Rest', xpReward: 10 },
    { id: 'w_office_3', time: '02:00 PM – 03:00 PM', duration: 1.0, activity: 'Office Work: Sync & Reviews', category: 'Job/Office', xpReward: 10 },
    { id: 'w_office_code', time: '03:00 PM – 04:00 PM', duration: 1.0, activity: 'Hands-on: AI Agent Dev / Hands-on Coding', category: 'Training & AI', xpReward: 15 },
    { id: 'w_office_4', time: '04:00 PM – 06:00 PM', duration: 2.0, activity: 'Office Work: Final Daily Sprints', category: 'Job/Office', xpReward: 20 },
    { id: 'w_refresh', time: '06:00 PM – 06:30 PM', duration: 0.5, activity: 'Commute & Evening Refreshment', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_mi_evening', time: '06:30 PM – 07:30 PM', duration: 1.0, activity: 'Mi Lifestyle Calls & Customer Follow-ups', category: 'Mi Lifestyle', xpReward: 15 },
    { id: 'w_dinner', time: '07:30 PM – 08:00 PM', duration: 0.5, activity: 'Dinner with Family', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_ai_dev', time: '08:00 PM – 09:00 PM', duration: 1.0, activity: 'AI Project Development (Portfolio Agent)', category: 'Training & AI', xpReward: 15 },
    { id: 'w_content', time: '09:00 PM – 09:30 PM', duration: 0.5, activity: 'Training Content / LinkedIn / GitHub Updates', category: 'Training & AI', xpReward: 10 },
    { id: 'w_winddown', time: '09:30 PM – 10:00 PM', duration: 0.5, activity: 'Planning Next Day & Sleep Prep', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_sleep', time: '10:00 PM', duration: 0.0, activity: 'Restful Sleep (7.5 hours)', category: 'Family/Rest', xpReward: 5 }
  ],
  saturday: [
    { id: 'sa_wake', time: '05:30 AM', duration: 0.25, activity: 'Wake up, water, freshen up', category: 'Family/Rest', xpReward: 5 },
    { id: 'sa_cycling', time: '05:45 AM – 06:45 AM', duration: 1.0, activity: 'Cycling (Cardio)', category: 'Health', xpReward: 15 },
    { id: 'sa_yoga', time: '06:45 AM – 07:45 AM', duration: 1.0, activity: 'Yoga, Exercise & Meditation', category: 'Health', xpReward: 15 },
    { id: 'sa_bath', time: '07:45 AM – 08:15 AM', duration: 0.5, activity: 'Freshen Up & Shower', category: 'Family/Rest', xpReward: 5 },
    { id: 'sa_breakfast', time: '08:15 AM – 08:45 AM', duration: 0.5, activity: 'Breakfast', category: 'Family/Rest', xpReward: 5 },
    { id: 'sa_mi_followup', time: '08:45 AM – 09:30 AM', duration: 0.75, activity: 'Mi Lifestyle morning customer replies', category: 'Mi Lifestyle', xpReward: 10 },
    { id: 'sa_mi_field', time: '09:30 AM – 12:45 PM', duration: 3.25, activity: 'Mi Lifestyle field work / team seminars', category: 'Mi Lifestyle', xpReward: 25 },
    { id: 'sa_lunch', time: '12:45 PM – 02:00 PM', duration: 1.25, activity: 'Lunch & Brief Rest', category: 'Family/Rest', xpReward: 10 },
    { id: 'sa_agent_dev', time: '02:00 PM – 05:00 PM', duration: 3.0, activity: 'Build AI Agent Projects (Saturday Deep Focus)', category: 'Training & AI', xpReward: 25 },
    { id: 'sa_personal', time: '05:00 PM – 10:00 PM', duration: 5.0, activity: 'Personal & Family Outing', category: 'Family/Rest', xpReward: 15 },
    { id: 'sa_sleep', time: '10:00 PM', duration: 0.0, activity: 'Sleep', category: 'Family/Rest', xpReward: 5 }
  ],
  sunday: [
    { id: 'su_growth', time: '06:00 AM – 07:30 AM', duration: 1.5, activity: 'Morning Growth & Technical Reading', category: 'Health', xpReward: 15 },
    { id: 'su_temple', time: '08:00 AM – 01:00 PM', duration: 5.0, activity: 'Temple Visit & Quality Family Time', category: 'Family/Rest', xpReward: 20 },
    { id: 'su_lunch', time: '01:00 PM – 02:00 PM', duration: 1.0, activity: 'Lunch with Family', category: 'Family/Rest', xpReward: 5 },
    { id: 'su_planning', time: '02:00 PM – 04:00 PM', duration: 2.0, activity: 'Weekly Review & Planning for Next Week', category: 'Training & AI', xpReward: 15 },
    { id: 'su_videos', time: '04:00 PM – 06:00 PM', duration: 2.0, activity: 'Record Technical Training Videos', category: 'Training & AI', xpReward: 25 },
    { id: 'su_posting', time: '06:00 PM – 07:00 PM', duration: 1.0, activity: 'LinkedIn Content / GitHub Updates', category: 'Training & AI', xpReward: 15 },
    { id: 'su_rest', time: '07:00 PM – 10:00 PM', duration: 3.0, activity: 'Rest & Prepare for the Week', category: 'Family/Rest', xpReward: 10 },
    { id: 'su_sleep', time: '10:00 PM', duration: 0.0, activity: 'Restful Sleep', category: 'Family/Rest', xpReward: 5 }
  ]
};

export const PRIORITY_FORMULA = [
  { category: 'Health', target: 2.0, unit: 'hours', description: 'Cycling (1h) + Yoga/Meditation (1h)' },
  { category: 'Job/Office', target: 5.0, unit: 'hours', description: 'Office Hours (excluding skill study)' },
  { category: 'Mi Lifestyle', target: 1.75, unit: 'hours', description: 'Mi Customer responses + Calls' },
  { category: 'Training & AI', target: 3.5, unit: 'hours', description: 'Office segments + Evening dev/content' },
  { category: 'Family/Rest', target: 3.75, unit: 'hours', description: 'Meals, sleep prep, family slots' }
];

export const routineService = {
  getRoutineLogs: async (userId, date) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.get('', { params: { action: 'routineLogs', userId, date } });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to fetch routine logs');
        return res.data.logs;
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch routine logs');
      }
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockDb.getRoutineLogs(userId, date));
        }, 200);
      });
    }
  },

  toggleRoutineActivity: async (userId, activityId, date, completed, xpReward) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'logRoutine', userId, activityId, date, completed, xpReward });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to log routine activity');
        return res.data;
      } catch (err) {
        throw new Error(err.message || 'Failed to log routine activity');
      }
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockDb.logRoutineActivity(userId, activityId, date, completed, xpReward));
        }, 200);
      });
    }
  }
};
