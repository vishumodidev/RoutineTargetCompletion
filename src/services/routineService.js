import { mockDb } from '../utils/mockDb';

export const ROUTINE_TEMPLATES = {
  weekday: [
    { id: 'w_wake', time: '05:30 AM', duration: 0.25, activity: 'Wake up, water, freshen up', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_cycling', time: '05:45 AM – 06:45 AM', duration: 1.0, activity: 'Cycling', category: 'Health', xpReward: 15 },
    { id: 'w_yoga', time: '06:45 AM – 07:45 AM', duration: 1.0, activity: 'Yoga + Exercise', category: 'Health', xpReward: 15 },
    { id: 'w_bath', time: '07:45 AM – 08:15 AM', duration: 0.5, activity: 'Bath', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_breakfast', time: '08:15 AM – 08:45 AM', duration: 0.5, activity: 'Breakfast', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_mi_calls', time: '08:45 AM – 09:30 AM', duration: 0.75, activity: 'Mi Lifestyle follow-up calls/messages', category: 'Mi Lifestyle', xpReward: 10 },
    { id: 'w_prep', time: '09:30 AM – 10:00 AM', duration: 0.5, activity: 'Office preparation', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_office_1', time: '10:00 AM – 01:00 PM', duration: 3.0, activity: 'Office Work', category: 'Job/Office', xpReward: 20 },
    { id: 'w_lunch', time: '01:00 PM – 02:00 PM', duration: 1.0, activity: 'Lunch + Relax', category: 'Family/Rest', xpReward: 10 },
    { id: 'w_office_2', time: '02:00 PM – 03:00 PM', duration: 1.0, activity: 'Office Work', category: 'Job/Office', xpReward: 15 },
    { id: 'w_tea', time: '03:00 PM – 03:15 PM', duration: 0.25, activity: 'Tea Break', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_office_3', time: '03:15 PM – 06:00 PM', duration: 2.75, activity: 'Office Work', category: 'Job/Office', xpReward: 20 },
    { id: 'w_refresh', time: '06:00 PM – 06:30 PM', duration: 0.5, activity: 'Refresh + Tea', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_mi_meetings', time: '06:30 PM – 07:30 PM', duration: 1.0, activity: 'Mi Lifestyle meetings / presentations', category: 'Mi Lifestyle', xpReward: 15 },
    { id: 'w_dinner', time: '07:30 PM – 08:00 PM', duration: 0.5, activity: 'Dinner', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_training_learn', time: '08:00 PM – 09:00 PM', duration: 1.0, activity: 'Corporate Training Preparation / AI Learning', category: 'Training & AI', xpReward: 15 },
    { id: 'w_freelance', time: '09:00 PM – 09:45 PM', duration: 0.75, activity: 'Freelance Projects / LinkedIn / Job Opportunities', category: 'Training & AI', xpReward: 15 },
    { id: 'w_plan_next', time: '09:45 PM – 10:00 PM', duration: 0.25, activity: 'Plan next day', category: 'Family/Rest', xpReward: 5 },
    { id: 'w_sleep', time: '10:15 PM', duration: 0.0, activity: 'Sleep', category: 'Family/Rest', xpReward: 5 }
  ],
  saturday: [
    { id: 'sa_wake', time: '05:30 AM', duration: 0.25, activity: 'Wake up, water, freshen up', category: 'Family/Rest', xpReward: 5 },
    { id: 'sa_cycling', time: '05:45 AM – 06:45 AM', duration: 1.0, activity: 'Cycling', category: 'Health', xpReward: 15 },
    { id: 'sa_yoga', time: '06:45 AM – 07:45 AM', duration: 1.0, activity: 'Yoga + Exercise', category: 'Health', xpReward: 15 },
    { id: 'sa_bath', time: '07:45 AM – 08:15 AM', duration: 0.5, activity: 'Bath', category: 'Family/Rest', xpReward: 5 },
    { id: 'sa_breakfast', time: '08:15 AM – 08:45 AM', duration: 0.5, activity: 'Breakfast', category: 'Family/Rest', xpReward: 5 },
    { id: 'sa_mi_field', time: '09:00 AM – 12:00 PM', duration: 3.0, activity: 'Mi Lifestyle field work', category: 'Mi Lifestyle', xpReward: 25 },
    { id: 'sa_lunch', time: '12:00 PM – 02:00 PM', duration: 2.0, activity: 'Lunch + Rest', category: 'Family/Rest', xpReward: 10 },
    { id: 'sa_training_content', time: '02:00 PM – 04:00 PM', duration: 2.0, activity: 'Training Content Creation', category: 'Training & AI', xpReward: 25 },
    { id: 'sa_personal', time: '04:00 PM – 10:00 PM', duration: 6.0, activity: 'Personal & Family Time', category: 'Family/Rest', xpReward: 15 }
  ],
  sunday: [
    { id: 'su_growth', time: '06:00 AM – 08:00 AM', duration: 2.0, activity: 'Morning Growth', category: 'Health', xpReward: 15 },
    { id: 'su_temple', time: '08:00 AM – 01:00 PM', duration: 5.0, activity: 'Temple & Family Time', category: 'Family/Rest', xpReward: 20 },
    { id: 'su_lunch', time: '01:00 PM – 02:00 PM', duration: 1.0, activity: 'Lunch', category: 'Family/Rest', xpReward: 5 },
    { id: 'su_planning', time: '02:00 PM – 04:00 PM', duration: 2.0, activity: 'Weekly Planning', category: 'Family/Rest', xpReward: 15 },
    { id: 'su_videos', time: '04:00 PM – 06:00 PM', duration: 2.0, activity: 'Record Training Videos', category: 'Training & AI', xpReward: 25 },
    { id: 'su_posting', time: '06:00 PM – 07:00 PM', duration: 1.0, activity: 'LinkedIn Content Posting', category: 'Training & AI', xpReward: 15 },
    { id: 'su_rest', time: '07:00 PM – 10:00 PM', duration: 3.0, activity: 'Rest & Prepare for Week', category: 'Family/Rest', xpReward: 10 }
  ]
};

export const PRIORITY_FORMULA = [
  { category: 'Health', target: 2.0, unit: 'hours', description: 'Cycling (1h) + Yoga/Exercise (1h)' },
  { category: 'Job/Office', target: 8.0, unit: 'hours', description: 'Office Hours structure' },
  { category: 'Mi Lifestyle', target: 1.0, unit: 'hours', description: 'Mi Lifestyle calls / presentations' },
  { category: 'Training & AI', target: 1.5, unit: 'hours', description: 'Training Prep & AI learning' },
  { category: 'Family/Rest', target: 1.0, unit: 'hours', description: 'Rest, meals, reflection' }
];

export const routineService = {
  getRoutineLogs: async (userId, date) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.getRoutineLogs(userId, date));
      }, 200);
    });
  },

  toggleRoutineActivity: async (userId, activityId, date, completed, xpReward) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.logRoutineActivity(userId, activityId, date, completed, xpReward));
      }, 200);
    });
  }
};
