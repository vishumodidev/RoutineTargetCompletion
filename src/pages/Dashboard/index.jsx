import { useContext, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { DashboardContext } from '../../context/DashboardContext';
import { 
  Trophy, 
  Zap, 
  Plus, 
  ArrowRight, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Award, 
  Sparkles, 
  BookOpen, 
  Code, 
  Heart, 
  Smile,
  DollarSign,
  Target,
  Copy,
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  CheckSquare,
  Trash2,
  Edit3,
  Flame,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { getLevelDetails } from '../../utils';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, updateUserProfile } = useContext(AuthContext);
  const { 
    todayBigFive, 
    opportunities, 
    todayTime, 
    loading, 
    fetchDashboard, 
    updateBigFiveStatus, 
    updateOpportunity, 
    deleteOpportunity, 
    updateTimeAllocation 
  } = useContext(DashboardContext);

  const navigate = useNavigate();

  // Dialog / Edit modes
  const [showAddOpp, setShowAddOpp] = useState(false);
  const [newOppName, setNewOppName] = useState('');
  const [newOppSource, setNewOppSource] = useState('LinkedIn');
  const [newOppStage, setNewOppStage] = useState('New Leads');
  const [newOppValue, setNewOppValue] = useState('');

  // AI Mentor Modal state
  const [showMentorReport, setShowMentorReport] = useState(false);

  // Edit states for Tech Focus
  const [isEditingTech, setIsEditingTech] = useState(false);
  const [techFocus, setTechFocus] = useState({
    currentSkillFocus: '',
    todayLearningTarget: '',
    currentProjectName: '',
    todayBuildTaskName: '',
    projectProgressPercent: 0
  });

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Sync tech focus inputs with user context
  useEffect(() => {
    if (user) {
      setTechFocus({
        currentSkillFocus: user.currentSkillFocus || 'Agentic AI',
        todayLearningTarget: user.todayLearningTarget || 'Tool Calling — 60 min',
        currentProjectName: user.currentProjectName || 'AI CRM Agent',
        todayBuildTaskName: user.todayBuildTaskName || 'Lead Qualification Workflow',
        projectProgressPercent: user.projectProgressPercent || 42
      });
    }
  }, [user]);

  if (!user) return null;

  const { level, xpRemaining, percent } = getLevelDetails(user.xp);

  // SECTION 2: Income stats calculation
  // Confirmed comes from opportunities stage "Confirmed"
  // Pipeline comes from all opportunities not in "Confirmed"
  const opportunityStats = useMemo(() => {
    const opps = opportunities || [];
    let receivedVal = user.incomeReceived || 75000;
    let milestoneVal = user.incomeMilestone || 150000;
    
    let confirmedVal = 0;
    let pipelineTotalVal = 0;
    let pipelineWeightedVal = 0;

    const weights = {
      'New Leads': 0.1,
      'Qualified Leads': 0.3,
      'Meetings': 0.5,
      'Proposals': 0.7,
      'Negotiations': 0.8,
      'Confirmed': 1.0
    };

    opps.forEach(opp => {
      const val = Number(opp.value) || 0;
      const weight = weights[opp.stage] || 0.1;
      if (opp.stage === 'Confirmed') {
        confirmedVal += val;
      } else {
        pipelineTotalVal += val;
        pipelineWeightedVal += val * weight;
      }
    });

    const gap = Math.max(0, milestoneVal - receivedVal - confirmedVal);

    return {
      received: receivedVal,
      confirmed: confirmedVal,
      pipeline: pipelineTotalVal,
      weightedPipeline: Math.round(pipelineWeightedVal),
      milestone: milestoneVal,
      gap
    };
  }, [opportunities, user.incomeReceived, user.incomeMilestone]);

  // Handle saving inline opportunity
  const handleAddOppSubmit = async (e) => {
    e.preventDefault();
    if (!newOppName.trim()) {
      toast.error('Client name is required');
      return;
    }
    const val = Number(newOppValue) || 0;
    await updateOpportunity({
      clientName: newOppName,
      source: newOppSource,
      stage: newOppStage,
      value: val
    });
    setNewOppName('');
    setNewOppValue('');
    setShowAddOpp(false);
    toast.success('Opportunity added to pipeline!');
  };

  // Stage changes on the fly
  const handleStageChange = async (opp, newStage) => {
    await updateOpportunity({
      ...opp,
      stage: newStage
    });
    toast.success(`Pipeline stage updated to ${newStage}`);
  };

  // Tech focus submit
  const handleSaveTech = () => {
    updateUserProfile(techFocus);
    setIsEditingTech(false);
    toast.success('Career details updated!');
  };

  // Adjust counter attributes for MI
  const adjustCounter = (key, delta, min = 0) => {
    const newVal = Math.max(min, (user[key] || 0) + delta);
    updateUserProfile({ [key]: newVal });
  };

  // Adjust time logs
  const handleTimeChange = async (category, hrs) => {
    const today = new Date().toISOString().split('T')[0];
    await updateTimeAllocation(today, category, hrs);
  };

  // Today's Score Logic
  const calculatedScore = useMemo(() => {
    let score = 0;
    // Big 5 completed tasks
    const completedBig5 = todayBigFive.filter(b => b.status === 'Done').length;
    score += completedBig5 * 20;

    // Opportunities confirmed
    const confirmedCount = (opportunities || []).filter(o => o.stage === 'Confirmed').length;
    score += confirmedCount * 50;

    // Health logs checked (yoga/cycling)
    const healthBig5 = todayBigFive.find(b => b.category === 'HEALTH');
    if (healthBig5 && healthBig5.status === 'Done') score += 10;

    score += Math.round(user.xp * 0.05);

    return score;
  }, [todayBigFive, opportunities, user.xp]);

  // AI Mentor prompt builder
  const mentorPromptText = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const big5Text = todayBigFive.map(b => `  - [${b.status === 'Done' ? 'x' : ' '}] [${b.category}] ${b.taskName} (${b.status})`).join('\n');
    const oppText = (opportunities || []).map(o => `  - ${o.clientName} (Source: ${o.source}, Stage: ${o.stage}, Value: ₹${o.value})`).join('\n');
    const timeText = todayTime.map(t => `  - ${t.category}: ${t.hours} hours`).join('\n');

    return `DATE: ${todayStr}
DAY TYPE: ${user.dayType || 'NORMAL GROWTH DAY'}

FITNESS SUMMARY:
${todayBigFive.find(b => b.category === 'HEALTH')?.status === 'Done' ? '✔ Completed 120 mins morning fitness (Cycling/Yoga)' : '❌ Morning fitness incomplete'}

TODAY'S BIG 5 PERFORMANCE:
${big5Text}

OPPORTUNITY PIPELINE FUNNEL:
${oppText}
- Confirmed Revenue: ₹${opportunityStats.confirmed.toLocaleString('en-IN')}
- Open Pipeline: ₹${opportunityStats.pipeline.toLocaleString('en-IN')}
- Weighted Pipeline: ₹${opportunityStats.weightedPipeline.toLocaleString('en-IN')}

FINANCIAL OVERVIEW:
- Received This Month: ₹${opportunityStats.received.toLocaleString('en-IN')}
- Confirmed Upcoming: ₹${opportunityStats.confirmed.toLocaleString('en-IN')}
- Target Milestone: ₹${opportunityStats.milestone.toLocaleString('en-IN')}
- Remaining Gap: ₹${opportunityStats.gap.toLocaleString('en-IN')}

AI / TECH FOCUS:
- Focus: ${user.currentSkillFocus || 'Agentic AI'}
- Learning Task: ${user.todayLearningTarget || 'Tool Calling — 60 min'}
- Project: ${user.currentProjectName || 'AI CRM Agent'}
- Build Task: ${user.todayBuildTaskName || 'Lead Qualification Workflow'}
- Project Progress: ${user.projectProgressPercent || 0}%

MI BUSINESS OUTLOOK:
- Active Downline Distributors: ${user.activeDistributors || 0}
- Left organization: ${user.distributorsLeft || 0}/10
- Right organization: ${user.distributorsRight || 0}/10
- Today's prospects met: ${user.todayProspects || 0}
- Today's follow-ups: ${user.todayFollowUps || 0}
- Today's presentations: ${user.todayPresentations || 0}
- Independent downline activities: ${user.teamActivityCount || 0}

ACTUAL TIME ALLOCATIONS:
${timeText}

DAILY EXECUTIVE SCORE: ${calculatedScore}

==================================================
Act as my career and business mentor.

My current income is approximately ₹60K–₹1L/month.

My progression is:
₹1.5L consistent
→ ₹2L
→ ₹3L
→ ₹5L long term.

Analyze today's report.

Tell me:
1. What produced real value?
2. What was low-value work?
3. What is my current bottleneck?
4. Did I spend too much time learning instead of earning/building?
5. How is my training/client pipeline?
6. How is my MI business progressing?
7. What should I prioritize tomorrow?
8. Should my career strategy change based on the data?`;
  }, [todayBigFive, opportunities, todayTime, opportunityStats, user, calculatedScore]);

  const copyMentorReport = () => {
    navigator.clipboard.writeText(mentorPromptText);
    toast.success('AI Mentor Report copied to clipboard!');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner Header & Executive Score */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary/20 via-purple-600/10 to-transparent border border-brand-primary/20 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-brand-primary/20 text-brand-primary px-2.5 py-1 rounded-md">
                Career & Business OS V2
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-md">
                {user.dayType || 'NORMAL GROWTH DAY'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Vishu's Cockpit
            </h1>
            <p className="text-text-secondary text-sm max-w-xl leading-relaxed">
              Track money pipelines, active distributor matrices, commercial builds, and daily high-impact actions.
            </p>
          </div>

          {/* Executive Score & Level Widget */}
          <div className="flex items-center space-x-5 bg-bg-dark/60 border border-border-dark p-4 rounded-xl">
            <div className="text-center">
              <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest block">Executive Score</span>
              <span className="text-3xl font-black text-brand-primary block mt-0.5">{calculatedScore}</span>
            </div>
            <div className="w-px h-10 bg-border-dark" />
            <div className="space-y-1">
              <div className="flex items-center justify-between text-2xs font-bold text-text-secondary">
                <span>LVL {level}</span>
                <span>{user.xp} XP</span>
              </div>
              <div className="w-24 bg-bg-input h-1.5 rounded-full overflow-hidden border border-border-dark">
                <div 
                  className="bg-gradient-to-r from-brand-primary to-purple-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Dynamic Day Type Configurer */}
        <div className="mt-6 flex flex-wrap gap-2.5 items-center relative z-10 border-t border-border-dark/40 pt-4">
          <span className="text-xs text-text-secondary font-bold">Select Day Type:</span>
          {['NORMAL GROWTH DAY', 'TRAINING DAY', 'CLIENT PROJECT DAY', 'TRAVEL DAY', 'RECOVERY DAY', 'SUNDAY REVIEW'].map(type => (
            <button
              key={type}
              onClick={() => {
                updateUserProfile({ dayType: type });
                toast.success(`Day Mode configured to: ${type}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                user.dayType === type 
                  ? 'bg-brand-primary text-white shadow-md' 
                  : 'bg-bg-input text-text-secondary hover:text-white border border-border-dark'
              }`}
            >
              {type.split(' ')[0]}
            </button>
          ))}
        </div>
      </section>

      {/* Grid: Sections 1 & 2 - Current Mission & Income Gap */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 1: Current Mission */}
        <div className="lg:col-span-5 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Target className="h-4.5 w-4.5 text-brand-primary mr-2" />
            Current Mission Tiers
          </h3>

          <div className="space-y-3.5">
            {/* Dynamic Baseline Display */}
            <div className="p-3 bg-bg-dark/40 border border-border-dark/60 rounded-lg">
              <span className="text-[10px] font-black text-text-secondary uppercase">Calculated Monthly Baseline</span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-xl font-extrabold text-white">₹60,000 – ₹1,00,000</span>
                <span className="text-3xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-black">ACTIVE BASE</span>
              </div>
            </div>

            {/* Target Progression Indicators */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-text-secondary uppercase">Milestone Tracks</span>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { label: 'Milestone 1', value: '₹1.5L', desc: 'Consistently', active: true },
                  { label: 'Milestone 2', value: '₹2.0L', desc: 'Next Phase', active: false },
                  { label: 'Milestone 3', value: '₹3.0L', desc: 'Architect Level', active: false },
                  { label: 'Long Term', value: '₹5.0L', desc: 'Final Tier', active: false }
                ].map((m, i) => (
                  <div 
                    key={i} 
                    className={`p-2.5 rounded-lg border text-2xs transition-all ${
                      m.active 
                        ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary font-bold shadow-lg shadow-brand-primary/5' 
                        : 'bg-bg-dark/30 border-border-dark text-text-secondary opacity-60'
                    }`}
                  >
                    <p className="font-extrabold text-white">{m.value}</p>
                    <p className="text-[9px] mt-0.5 text-text-secondary">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Income Gap */}
        <div className="lg:col-span-7 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <DollarSign className="h-4.5 w-4.5 text-emerald-400 mr-2" />
              Monthly Income Gap Cockpit
            </h3>
            
            {/* Quick adjust received income */}
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => adjustCounter('incomeReceived', -5000, 0)}
                className="text-text-secondary hover:text-white"
              >
                <MinusCircle className="h-4 w-4" />
              </button>
              <span className="text-3xs font-black text-text-secondary">ADJUST</span>
              <button 
                onClick={() => adjustCounter('incomeReceived', 5000, 0)}
                className="text-text-secondary hover:text-white"
              >
                <PlusCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Math Board Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-bg-dark/40 border border-border-dark rounded-lg text-center">
              <span className="text-[9px] font-bold text-text-secondary uppercase">Received</span>
              <p className="text-lg font-black text-emerald-400 mt-1">₹{opportunityStats.received.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-bg-dark/40 border border-border-dark rounded-lg text-center">
              <span className="text-[9px] font-bold text-text-secondary uppercase">Confirmed</span>
              <p className="text-lg font-black text-indigo-400 mt-1">₹{opportunityStats.confirmed.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-bg-dark/40 border border-border-dark rounded-lg text-center">
              <span className="text-[9px] font-bold text-text-secondary uppercase">Remaining Gap</span>
              <p className="text-lg font-black text-rose-400 mt-1">₹{opportunityStats.gap.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Gap Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-3xs font-bold text-text-secondary">
              <span>Gap to Milestone (₹1.5L)</span>
              <span>
                {Math.round(((opportunityStats.received + opportunityStats.confirmed) / opportunityStats.milestone) * 100)}% Closed
              </span>
            </div>
            <div className="w-full bg-bg-input h-2 rounded-full overflow-hidden border border-border-dark">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, ((opportunityStats.received + opportunityStats.confirmed) / opportunityStats.milestone) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid: Sections 3 & 5 - Today's Big 5 & Technology/Career */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 3: Today's Big 5 */}
        <div className="lg:col-span-7 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <CheckSquare className="h-4.5 w-4.5 text-brand-primary mr-2" />
              Today's Big 5 Highest-Value Actions
            </h3>
            <span className="text-3xs text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded flex items-center">
              <Flame className="h-3 w-3 mr-1 fill-yellow-400" /> XP Multipliers
            </span>
          </div>

          <div className="space-y-2.5">
            {todayBigFive.map((task) => {
              const colors = {
                HEALTH: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
                MONEY: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-400',
                BUILD: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400',
                LEARN: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
                'MI BUSINESS': 'border-purple-500/20 bg-purple-500/5 text-purple-400',
              };

              const taskTheme = colors[task.category] || 'border-border-dark bg-bg-dark';

              return (
                <div 
                  key={task.id} 
                  className={`p-3.5 border rounded-xl flex items-center justify-between gap-4 transition-all hover:bg-bg-dark/15`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider mt-0.5 shrink-0 ${taskTheme}`}>
                      {task.category}
                    </span>
                    <span className={`text-xs font-semibold leading-relaxed ${task.status === 'Done' ? 'line-through text-text-secondary' : 'text-white'}`}>
                      {task.taskName}
                    </span>
                  </div>

                  {/* Status Dropdown Selector */}
                  <select
                    value={task.status}
                    onChange={(e) => {
                      updateBigFiveStatus(task.id, e.target.value);
                      toast.success(`Status updated for ${task.category}`);
                    }}
                    className={`bg-bg-input border border-border-dark rounded-lg text-2xs font-extrabold px-2.5 py-1.5 cursor-pointer outline-none ${
                      task.status === 'Done' 
                        ? 'text-emerald-400 border-emerald-500/35 bg-emerald-500/10' 
                        : task.status === 'In Progress' 
                        ? 'text-indigo-400 border-indigo-500/35 bg-indigo-500/10' 
                        : task.status === 'Blocked' 
                        ? 'text-rose-400 border-rose-500/35 bg-rose-500/10'
                        : task.status === 'Skipped' 
                        ? 'text-text-secondary bg-bg-input/60'
                        : 'text-text-primary'
                    }`}
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Skipped">Skipped</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 5: Technology / Career focus */}
        <div className="lg:col-span-5 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Layers className="h-4.5 w-4.5 text-cyan-400 mr-2" />
              Technology & Portfolio focus
            </h3>
            <button
              onClick={() => isEditingTech ? handleSaveTech() : setIsEditingTech(true)}
              className="text-text-secondary hover:text-white flex items-center space-x-1 text-3xs font-extrabold bg-bg-input border border-border-dark px-2 py-1 rounded-lg transition cursor-pointer"
            >
              <Edit3 className="h-3 w-3" />
              <span>{isEditingTech ? 'Save' : 'Edit'}</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {isEditingTech ? (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-3xs font-bold text-text-secondary uppercase mb-1">Focus Skill</label>
                  <input
                    type="text"
                    value={techFocus.currentSkillFocus}
                    onChange={(e) => setTechFocus({ ...techFocus, currentSkillFocus: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-text-secondary uppercase mb-1">Study Target</label>
                  <input
                    type="text"
                    value={techFocus.todayLearningTarget}
                    onChange={(e) => setTechFocus({ ...techFocus, todayLearningTarget: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-text-secondary uppercase mb-1">Portfolio Project</label>
                  <input
                    type="text"
                    value={techFocus.currentProjectName}
                    onChange={(e) => setTechFocus({ ...techFocus, currentProjectName: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-text-secondary uppercase mb-1">Build Target</label>
                  <input
                    type="text"
                    value={techFocus.todayBuildTaskName}
                    onChange={(e) => setTechFocus({ ...techFocus, todayBuildTaskName: e.target.value })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-text-secondary uppercase mb-1">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={techFocus.projectProgressPercent}
                    onChange={(e) => setTechFocus({ ...techFocus, projectProgressPercent: Number(e.target.value) })}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-bg-dark/40 border border-border-dark/60 rounded-lg">
                    <span className="text-3xs text-text-secondary font-black uppercase">Current Focus</span>
                    <p className="font-extrabold text-white mt-1">{user.currentSkillFocus || 'Agentic AI'}</p>
                    <span className="text-[10px] text-brand-primary block mt-1.5">{user.todayLearningTarget || '60 min Study'}</span>
                  </div>

                  <div className="p-3 bg-bg-dark/40 border border-border-dark/60 rounded-lg">
                    <span className="text-3xs text-text-secondary font-black uppercase">Commercial Project</span>
                    <p className="font-extrabold text-white mt-1 truncate">{user.currentProjectName || 'AI CRM Agent'}</p>
                    <span className="text-[10px] text-cyan-400 block mt-1.5 truncate">Build: {user.todayBuildTaskName || 'Lead Qual Workflow'}</span>
                  </div>
                </div>

                {/* Progress Indicator */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-3xs font-bold text-text-secondary">
                    <span>Build Task Progress</span>
                    <span>{user.projectProgressPercent || 0}% Done</span>
                  </div>
                  <div className="w-full bg-bg-input h-2 rounded-full overflow-hidden border border-border-dark">
                    <div 
                      className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${user.projectProgressPercent || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Grid: Sections 4 & 6 - Opportunity Pipeline & MI Business */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 4: Opportunity Pipeline */}
        <div className="lg:col-span-7 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <TrendingUp className="h-4.5 w-4.5 text-indigo-400 mr-2" />
              Opportunity Pipeline Funnel
            </h3>
            
            <button
              onClick={() => setShowAddOpp(!showAddOpp)}
              className="text-3xs font-extrabold text-white bg-brand-primary hover:bg-brand-secondary border border-brand-primary px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Lead</span>
            </button>
          </div>

          {/* Summary Indicators */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2.5 bg-bg-dark/45 border border-border-dark rounded-lg text-center">
              <span className="text-[8px] font-bold text-text-secondary uppercase">Confirmed Upcoming</span>
              <p className="text-sm font-black text-white mt-0.5">₹{opportunityStats.confirmed.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2.5 bg-bg-dark/45 border border-border-dark rounded-lg text-center">
              <span className="text-[8px] font-bold text-text-secondary uppercase">Open Pipeline</span>
              <p className="text-sm font-black text-text-secondary mt-0.5">₹{opportunityStats.pipeline.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2.5 bg-bg-dark/45 border border-border-dark rounded-lg text-center">
              <span className="text-[8px] font-bold text-text-secondary uppercase">Weighted Pipeline</span>
              <p className="text-sm font-black text-indigo-400 mt-0.5">₹{opportunityStats.weightedPipeline.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Add Opportunity Inline Form */}
          {showAddOpp && (
            <form onSubmit={handleAddOppSubmit} className="p-4 bg-bg-dark/60 border border-border-dark rounded-xl space-y-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-3xs font-bold text-text-secondary uppercase mb-1">Lead Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corporate HR"
                    value={newOppName}
                    onChange={(e) => setNewOppName(e.target.value)}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-2xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-text-secondary uppercase mb-1">Source</label>
                  <select
                    value={newOppSource}
                    onChange={(e) => setNewOppSource(e.target.value)}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-2xs text-white"
                  >
                    {['WhatsApp', 'Referral', 'Previous Client', 'Training Vendor', 'LinkedIn', 'Corporate HR/L&D', 'College', 'Direct Outreach', 'Other'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-3xs font-bold text-text-secondary uppercase mb-1">Pipeline Stage</label>
                  <select
                    value={newOppStage}
                    onChange={(e) => setNewOppStage(e.target.value)}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-2xs text-white"
                  >
                    {['New Leads', 'Qualified Leads', 'Meetings', 'Proposals', 'Negotiations', 'Confirmed'].map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-3xs font-bold text-text-secondary uppercase mb-1">Value (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newOppValue}
                    onChange={(e) => setNewOppValue(e.target.value)}
                    className="w-full bg-bg-input border border-border-dark rounded-lg p-2 text-2xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOpp(false)}
                  className="px-3 py-1.5 bg-bg-input border border-border-dark text-text-secondary hover:text-white rounded-lg text-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-2xs font-bold"
                >
                  Save Lead
                </button>
              </div>
            </form>
          )}

          {/* Opportunities Funnel List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {opportunities.length === 0 ? (
              <p className="text-2xs text-text-secondary text-center py-6">No pipeline opportunities loaded.</p>
            ) : (
              opportunities.map(opp => (
                <div key={opp.id} className="p-3 bg-bg-dark/20 border border-border-dark rounded-xl flex items-center justify-between gap-3 text-2xs hover:bg-bg-dark/35">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold text-white truncate">{opp.clientName}</span>
                      <span className="text-[8px] bg-bg-input text-text-secondary px-1.5 py-0.5 rounded font-black border border-border-dark">
                        {opp.source}
                      </span>
                    </div>
                    <span className="text-3xs text-emerald-400 block mt-1 font-semibold">Value: ₹{opp.value?.toLocaleString('en-IN') || 0}</span>
                  </div>

                  {/* Stage Quick Switcher */}
                  <div className="flex items-center space-x-2">
                    <select
                      value={opp.stage}
                      onChange={(e) => handleStageChange(opp, e.target.value)}
                      className="bg-bg-input border border-border-dark rounded-lg text-3xs font-extrabold px-2 py-1 text-white"
                    >
                      {['New Leads', 'Qualified Leads', 'Meetings', 'Proposals', 'Negotiations', 'Confirmed'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        if (confirm('Delete opportunity?')) {
                          deleteOpportunity(opp.id);
                          toast.error('Opportunity removed');
                        }
                      }}
                      className="p-1 text-text-secondary hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECTION 6: MI Business Tracker */}
        <div className="lg:col-span-5 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Award className="h-4.5 w-4.5 text-purple-400 mr-2" />
            MI Business Tracker (2–3 Year Experiment)
          </h3>

          <div className="space-y-4 text-2xs">
            {/* Distributors Gauge Matrix */}
            <div className="p-3 bg-bg-dark/45 border border-border-dark rounded-xl">
              <div className="flex justify-between items-center text-3xs text-text-secondary font-black mb-2">
                <span>Active Distributors: {user.activeDistributors || 0}</span>
                <span className="text-purple-400">ORGANIZATION ROADMAP</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-bg-card border border-border-dark p-2.5 rounded-lg space-y-1">
                  <span className="text-3xs text-text-secondary font-bold block">Left Leg Target</span>
                  <p className="text-base font-black text-white">{user.distributorsLeft || 0} / 10</p>
                  
                  {/* +/- distributor counters */}
                  <div className="flex justify-center items-center space-x-2.5 pt-1">
                    <button 
                      onClick={() => adjustCounter('distributorsLeft', -1)} 
                      className="text-text-secondary hover:text-white"
                    >
                      <MinusCircle className="h-4.5 w-4.5" />
                    </button>
                    <button 
                      onClick={() => adjustCounter('distributorsLeft', 1)} 
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <PlusCircle className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                <div className="bg-bg-card border border-border-dark p-2.5 rounded-lg space-y-1">
                  <span className="text-3xs text-text-secondary font-bold block">Right Leg Target</span>
                  <p className="text-base font-black text-white">{user.distributorsRight || 0} / 10</p>

                  <div className="flex justify-center items-center space-x-2.5 pt-1">
                    <button 
                      onClick={() => adjustCounter('distributorsRight', -1)} 
                      className="text-text-secondary hover:text-white"
                    >
                      <MinusCircle className="h-4.5 w-4.5" />
                    </button>
                    <button 
                      onClick={() => adjustCounter('distributorsRight', 1)} 
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <PlusCircle className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* MI Today Actions */}
            <div className="grid grid-cols-4 gap-2 text-center text-3xs font-black">
              {[
                { key: 'todayProspects', label: 'Prospects' },
                { key: 'todayFollowUps', label: 'Follow-ups' },
                { key: 'todayPresentations', label: 'Presentations' },
                { key: 'todayCoaching', label: 'Coaching' }
              ].map(item => (
                <div key={item.key} className="bg-bg-dark/30 border border-border-dark p-2 rounded-lg space-y-1">
                  <span className="text-text-secondary block truncate">{item.label}</span>
                  <span className="text-sm font-black text-white block">{user[item.key] || 0}</span>
                  <div className="flex justify-center space-x-1.5 pt-0.5">
                    <button 
                      onClick={() => adjustCounter(item.key, -1)} 
                      className="text-text-secondary hover:text-white"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => adjustCounter(item.key, 1)} 
                      className="text-purple-400 hover:text-purple-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Team Activity indicators */}
            <div className="p-3 bg-bg-dark/40 border border-border-dark/60 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="text-3xs text-text-secondary font-black block">Team Generated Action (Independence Indicator)</span>
                <span className="text-xs font-bold text-white block mt-1">Downlines running {user.teamActivityCount || 0} autonomous actions</span>
              </div>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => adjustCounter('teamActivityCount', -1)} 
                  className="p-1 bg-bg-input hover:text-white border border-border-dark rounded-lg"
                >
                  -
                </button>
                <button 
                  onClick={() => adjustCounter('teamActivityCount', 1)} 
                  className="p-1 bg-bg-input text-purple-400 hover:text-purple-300 border border-border-dark rounded-lg"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid: Section 7 & AI Mentor Report generator */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 7: Time Allocation */}
        <div className="lg:col-span-7 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Clock className="h-4.5 w-4.5 text-yellow-400 mr-2" />
            Time Allocation vs Outcomes (Daily Hours)
          </h3>

          <div className="space-y-3.5 text-2xs font-semibold">
            {todayTime.map(item => {
              const maxHrs = item.category === 'Paid Training' || item.category === 'Client Project' ? 8.0 : 4.0;
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">{item.category}</span>
                    <span className="text-text-secondary font-bold">{item.hours} hours logged</span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <input 
                      type="range" 
                      min="0" 
                      max={maxHrs}
                      step="0.5"
                      value={item.hours}
                      onChange={(e) => handleTimeChange(item.category, e.target.value)}
                      className="flex-1 accent-brand-primary h-1 bg-bg-input rounded-full appearance-none cursor-pointer"
                    />
                    
                    {/* Eventual ROI calculation placeholder */}
                    {item.category === 'Paid Training' && (
                      <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded tracking-wide">
                        ROI: ₹{(18750).toLocaleString('en-IN')}/hr
                      </span>
                    )}
                    {item.category === 'MI Lifestyle' && (
                      <span className="text-[9px] font-black text-text-secondary bg-bg-input px-2 py-0.5 rounded tracking-wide">
                        ROI: Experiment
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Mentor Report Console */}
        <div className="lg:col-span-5 bg-bg-card border border-border-dark rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <FileText className="h-4.5 w-4.5 text-purple-400 mr-2" />
              AI Mentor Mentoring Prompt Console
            </h3>
            
            <p className="text-2xs text-text-secondary leading-relaxed mt-2">
              Generate a formatted prompt detailing today's business outcomes, income, downline distributorship targets, and fitness checks. Paste it into ChatGPT for executive career guidance.
            </p>

            {/* Modal preview toggler */}
            <div className="mt-4">
              <button
                onClick={() => setShowMentorReport(!showMentorReport)}
                className="w-full py-2.5 bg-bg-input hover:bg-bg-input/80 border border-border-dark text-white text-2xs font-extrabold rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-brand-primary animate-spin-slow" />
                <span>{showMentorReport ? 'Hide Prompt Details' : 'Compile Mentor Report Prompt'}</span>
              </button>
            </div>

            {showMentorReport && (
              <div className="mt-4 p-3.5 bg-bg-dark border border-border-dark rounded-xl space-y-2">
                <textarea
                  readOnly
                  value={mentorPromptText}
                  className="w-full h-44 bg-transparent border-0 resize-none text-[10px] font-mono leading-relaxed text-text-secondary outline-none focus:ring-0"
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={copyMentorReport}
              className="w-full py-3 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-brand-primary/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Copy className="h-4 w-4" />
              <span>COPY MENTOR PROMPT</span>
            </button>
          </div>
        </div>
      </section>

      {/* Gamification Stats Footer Showcase */}
      <section className="bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
          <Trophy className="h-4.5 w-4.5 text-yellow-400 mr-2" />
          Legacy Achievements Showcase
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'First Quest Cleared', badge: '🥇', desc: 'Completed your first daily habit check!' },
            { title: 'Streak Apprentice', badge: '🔥', desc: 'Achieved a legendary 12-day streak.' },
            { title: 'Level 3 Overlord', badge: '🛡️', desc: 'Unlocked the threshold of Level 3 tier.' }
          ].map((ach, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 bg-bg-dark/30 border border-border-dark/60 rounded-lg">
              <div className="text-xl p-2 rounded-lg bg-bg-input border border-border-dark h-11 w-11 flex items-center justify-center shrink-0">
                {ach.badge}
              </div>
              <div className="min-w-0">
                <h4 className="text-2xs font-extrabold text-white truncate">{ach.title}</h4>
                <p className="text-[10px] text-text-secondary truncate mt-0.5">{ach.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
