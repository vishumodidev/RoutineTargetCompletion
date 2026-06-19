import { useState, useEffect } from 'react';
import { 
  Milestone, 
  BookOpen, 
  Code, 
  Cloud, 
  Briefcase, 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Clock, 
  Layers, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  Sparkles
} from 'lucide-react';

const PHASES_DATA = [
  {
    id: 'phase1',
    title: 'Phase 1: Python for AI',
    months: 'Months 1-2 (Days 1-60)',
    focus: 'Core programming foundations & high-performance asynchronous backends',
    icon: Code,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    topics: [
      'Python Fundamentals (Syntax, Data Structures)',
      'OOP in Python (Classes, Inheritance, Dunder Methods)',
      'File Handling & Exception Safety',
      'API Integration (Requests, HTTP client basics)',
      'Async Programming (asyncio, Tasks, Concurrency)',
      'Virtual Environments (venv, poetry)',
      'Pip and Package Management'
    ],
    builds: [
      'Student Management System (CLI / File Database)',
      'Inventory Management System (Object-Oriented design)',
      'REST API using FastAPI (Boilerplate with routing & schemas)'
    ],
    resources: [
      { name: 'Python Documentation', url: 'https://docs.python.org/3/' },
      { name: 'FastAPI Documentation', url: 'https://fastapi.tiangolo.com/' }
    ]
  },
  {
    id: 'phase2',
    title: 'Phase 2: AI Foundations',
    months: 'Months 3-4 (Days 61-120)',
    focus: 'Language models, semantic databases, and basic Retrieval-Augmented Generation (RAG)',
    icon: BookOpen,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    topics: [
      'LLM Mechanics & Tokenization',
      'Prompt Engineering (Few-shot, Chain-of-Thought)',
      'Dense Embeddings & Vector Dimensions',
      'Vector Databases (Qdrant, Milvus, Chroma)',
      'RAG Core Architecture: User Question → Embedding → Vector Search → Context Retrieval → LLM Response'
    ],
    builds: [
      'PDF Chatbot (Local text parsing + Semantic Search)',
      'Company Knowledge Assistant (Internal Q&A system)',
      'Training Material Search Bot (Semantically index slides & notes)'
    ],
    resources: [
      { name: 'LangChain Documentation', url: 'https://python.langchain.com/' },
      { name: 'DeepLearning.AI Courses', url: 'https://www.deeplearning.ai/' }
    ]
  },
  {
    id: 'phase3',
    title: 'Phase 3: AI Agents',
    months: 'Months 5-6 (Days 121-180)',
    focus: 'Stateful multi-agent collaboration, planning, and custom tool calling',
    icon: Layers,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    topics: [
      'Agent Architectures (ReAct pattern, planning loops)',
      'Memory Retention (Short-term context vs Long-term memory)',
      'Tool Calling and API bindings',
      'Multi-Agent Systems (Hierarchical vs Sequential structures)',
      'Model Context Protocol (MCP)'
    ],
    builds: [
      'WhatsApp Agent (Automated conversational interface)',
      'Mi Lifestyle Distributor Agent (Lead nurturing & product advice)',
      'Clinic Assistant Agent (Patient scheduling & intake)',
      'Pharmacy Inventory Agent (Automatic stock alerts & drafts)'
    ],
    resources: [
      { name: 'LangGraph Documentation', url: 'https://langchain-ai.github.io/langgraph/' },
      { name: 'CrewAI Documentation', url: 'https://docs.crewai.com/' }
    ]
  },
  {
    id: 'phase4',
    title: 'Phase 4: Cloud & Deployment',
    months: 'Months 7-8 (Days 181-240)',
    focus: 'Microservices containerization, cloud orchestration, CI/CD pipelines, and health monitors',
    icon: Cloud,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    topics: [
      'Docker containerization (Multi-stage builds, networking)',
      'AWS Core (VPC, IAM, ECS, RDS, App Runner)',
      'CI/CD Pipelines (GitHub Actions, build triggers)',
      'Logging, Auditing, and Monitoring (Prometheus, Grafana)',
      'Production database migration practices'
    ],
    builds: [
      'Deploy AI Agent (Multi-container setup on ECS)',
      'Deploy FastAPI Backend (Auto-scaling with AWS App Runner)',
      'Production PostgreSQL Database setup with secure VPC bindings'
    ],
    resources: [
      { name: 'Docker Documentation', url: 'https://docs.docker.com/' },
      { name: 'AWS Training & Certification', url: 'https://aws.amazon.com/training/' }
    ]
  },
  {
    id: 'phase5',
    title: 'Phase 5: AI SaaS (Commercial Products)',
    months: 'Months 9-12 (Days 241-365)',
    focus: 'Packaging specialized workflows into commercial SaaS products',
    icon: Briefcase,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    topics: [
      'Multi-tenant SaaS Architecture databases',
      'Subscription billing models (Stripe integration)',
      'SaaS usage telemetry & token expenditure logging',
      'Advanced WhatsApp Cloud API production setups',
      'Landing page copywriting and lead funnel automations'
    ],
    builds: [
      'Product 1: Mi Lifestyle AI Assistant (Lead Management, Follow-ups, Recommendations, WhatsApp integration)',
      'Product 2: Clinic Management Agent (Patient Registration, Inventory Management, Reminders)',
      'Product 3: Corporate Training Agent (Course Planning, Assessment Generation, Attendance Tracking)'
    ],
    resources: [
      { name: 'Stripe SaaS Docs', url: 'https://stripe.com/docs/billing' },
      { name: 'Vite & Tailwind Production Guides', url: 'https://vite.dev/' }
    ]
  }
];

const WEEKLY_FEATURES = [
  { day: 'Monday', task: 'Login API & JWT security structures' },
  { day: 'Tuesday', task: 'CRUD Database API (SQLModel/ORM integration)' },
  { day: 'Wednesday', task: 'Vector Search Query Indexing (RAG pipelines)' },
  { day: 'Thursday', task: 'Agent Tool configuration (Custom API webhooks)' },
  { day: 'Friday', task: 'WhatsApp Business API Integration & Webhooks' }
];

export default function Roadmap() {
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('vishu_roadmap_progress');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      completedItems: [],
      activePhaseId: 'phase1'
    };
  });

  const [expandedPhase, setExpandedPhase] = useState('phase1');

  useEffect(() => {
    localStorage.setItem('vishu_roadmap_progress', JSON.stringify(progress));
  }, [progress]);

  const toggleItem = (itemId) => {
    setProgress(prev => {
      const isCompleted = prev.completedItems.includes(itemId);
      const nextCompleted = isCompleted
        ? prev.completedItems.filter(id => id !== itemId)
        : [...prev.completedItems, itemId];
      return { ...prev, completedItems: nextCompleted };
    });
  };

  const selectActivePhase = (phaseId) => {
    setProgress(prev => ({ ...prev, activePhaseId: phaseId }));
  };

  // Calculate percentages for each phase
  const getPhaseProgress = (phase) => {
    const totalItems = phase.topics.length + phase.builds.length;
    const completed = [...phase.topics, ...phase.builds].filter(item => 
      progress.completedItems.includes(`${phase.id}_${item}`)
    ).length;
    return totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
          <Milestone className="h-7 w-7 text-brand-primary mr-2.5" />
          AI Architect Transition Roadmap
        </h1>
        <p className="text-text-secondary text-sm">Step-by-step phased transition plan from Software Engineer to AI Solutions Architect</p>
      </div>

      {/* Overview Dashboard Widget */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Phase Tracker Card */}
        <div className="lg:col-span-2 p-6 bg-bg-card border border-border-dark rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 opacity-5 pointer-events-none w-64 h-64 bg-brand-primary rounded-full blur-3xl" />
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded">
                Active Training Track
              </span>
              <span className="text-xs text-text-secondary font-bold flex items-center">
                <Clock className="h-4 w-4 mr-1 text-cyan-400" />
                3-Hour Daily Formula Enabled
              </span>
            </div>
            
            {/* Find current active phase title */}
            {(() => {
              const activePhase = PHASES_DATA.find(p => p.id === progress.activePhaseId) || PHASES_DATA[0];
              const activePercent = getPhaseProgress(activePhase);
              return (
                <div className="mt-4">
                  <h3 className="text-lg font-black text-white">{activePhase.title}</h3>
                  <p className="text-xs text-text-secondary mt-1">{activePhase.focus}</p>
                  
                  {/* Progress bar */}
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-text-secondary">Phase Completion</span>
                      <span className="text-brand-primary">{activePercent}%</span>
                    </div>
                    <div className="w-full bg-bg-input h-2 rounded-full overflow-hidden border border-border-dark">
                      <div 
                        className="bg-gradient-to-r from-brand-primary to-purple-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${activePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          <div className="mt-6 pt-4 border-t border-border-dark flex justify-between items-center flex-wrap gap-3">
            <span className="text-2xs text-text-secondary">
              Check items below to increase your completion scores. Change your active tracking phase by checking "Track this Phase".
            </span>
          </div>
        </div>

        {/* 3-Hour Learning Formula Card */}
        <div className="p-6 bg-bg-card border border-border-dark rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Zap className="h-4.5 w-4.5 text-yellow-400 mr-2" />
            Daily 3-Hour Formula
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-bg-dark/40 border border-border-dark/60 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-white">During Office Hours</span>
                <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded">
                  2 Hours
                </span>
              </div>
              <p className="text-2xs text-text-secondary leading-relaxed">
                <strong>Hour 1:</strong> Study theoretical specs and documentation.<br />
                <strong>Hour 2:</strong> Write hands-on code applying what was learned.
              </p>
            </div>

            <div className="p-3 bg-bg-dark/40 border border-border-dark/60 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-white">Evening Block</span>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                  1 Hour
                </span>
              </div>
              <p className="text-2xs text-text-secondary leading-relaxed">
                Focus on building exactly <strong>one incremental feature</strong> for your portfolio project. Keep daily scope small to maintain consistency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Roadmap & Daily Schedule Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Accordion Phase List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
            <Layers className="h-5 w-5 text-brand-primary mr-2" />
            Transition Phases (Months 1–12)
          </h3>

          <div className="space-y-4">
            {PHASES_DATA.map((phase) => {
              const IconComponent = phase.icon;
              const isExpanded = expandedPhase === phase.id;
              const isActiveTrack = progress.activePhaseId === phase.id;
              const phasePercent = getPhaseProgress(phase);

              return (
                <div 
                  key={phase.id} 
                  className={`bg-bg-card border rounded-2xl overflow-hidden transition-all duration-200 ${
                    isActiveTrack 
                      ? 'border-brand-primary' 
                      : 'border-border-dark hover:border-brand-primary/30'
                  }`}
                >
                  {/* Header bar */}
                  <div 
                    onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                    className="p-4 md:p-5 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className={`h-10 w-10 rounded-lg ${phase.bg} ${phase.color} border ${phase.border} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <h4 className="text-sm font-bold text-white truncate">{phase.title}</h4>
                          <span className="text-[10px] font-bold text-text-secondary bg-bg-input px-2 py-0.5 rounded">
                            {phase.months}
                          </span>
                          {isActiveTrack && (
                            <span className="text-[9px] font-black text-brand-primary bg-brand-primary/20 border border-brand-primary/35 px-1.5 py-0.5 rounded">
                              Current Track
                            </span>
                          )}
                        </div>
                        <p className="text-2xs text-text-secondary mt-1 truncate max-w-md">{phase.focus}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <span className="text-xs font-bold text-text-secondary">
                        {phasePercent}%
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Expanded body content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-border-dark space-y-5 bg-bg-dark/20">
                      {/* Tracking control */}
                      {!isActiveTrack && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectActivePhase(phase.id);
                          }}
                          className="w-full text-center py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-2xs font-extrabold rounded-lg transition-colors cursor-pointer"
                        >
                          Track this Phase
                        </button>
                      )}

                      {/* Topics Checklist */}
                      <div className="space-y-2.5">
                        <h5 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center">
                          <BookOpen className="h-3.5 w-3.5 mr-1.5 text-brand-primary" />
                          Topics checklist
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {phase.topics.map((topic) => {
                            const uniqueId = `${phase.id}_${topic}`;
                            const isDone = progress.completedItems.includes(uniqueId);
                            return (
                              <button
                                key={topic}
                                onClick={() => toggleItem(uniqueId)}
                                className={`p-2.5 rounded-xl border text-left flex items-start space-x-2.5 transition-all text-xs cursor-pointer ${
                                  isDone 
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-text-secondary' 
                                    : 'bg-bg-input/40 border-border-dark hover:border-brand-primary/20 text-white'
                                }`}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="h-4.5 w-4.5 text-text-secondary flex-shrink-0 mt-0.5" />
                                )}
                                <span className={isDone ? 'line-through opacity-70' : ''}>{topic}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Builds Checklist */}
                      <div className="space-y-2.5">
                        <h5 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center">
                          <Code className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
                          Build Portfolio Projects
                        </h5>
                        <div className="space-y-2">
                          {phase.builds.map((build) => {
                            const uniqueId = `${phase.id}_${build}`;
                            const isDone = progress.completedItems.includes(uniqueId);
                            return (
                              <button
                                key={build}
                                onClick={() => toggleItem(uniqueId)}
                                className={`w-full p-3 rounded-xl border text-left flex items-start space-x-3 transition-all text-xs cursor-pointer ${
                                  isDone 
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-text-secondary' 
                                    : 'bg-bg-input/40 border-border-dark hover:border-brand-primary/20 text-white'
                                }`}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="h-4.5 w-4.5 text-text-secondary flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className={`font-semibold block ${isDone ? 'line-through opacity-70' : ''}`}>
                                    {build.split(' (')[0]}
                                  </span>
                                  {build.includes('(') && (
                                    <span className="text-[10px] text-text-secondary block mt-0.5">
                                      {build.substring(build.indexOf('(') + 1, build.length - 1)}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Resources */}
                      <div className="space-y-2 pt-2 border-t border-border-dark/50">
                        <h5 className="text-2xs font-extrabold text-text-secondary uppercase tracking-wider">
                          Recommended study portals
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {phase.resources.map((res) => (
                            <a
                              key={res.name}
                              href={res.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-3 py-1.5 bg-bg-input hover:bg-bg-input/80 border border-border-dark hover:border-brand-primary/30 rounded-lg text-2xs font-bold text-white transition"
                            >
                              {res.name}
                              <ExternalLink className="h-3 w-3 ml-1.5 text-text-secondary" />
                            </a>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Column: Daily Micro-Feats Checklist */}
        <div className="space-y-6">
          {/* Weekly Feature Build */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <Calendar className="h-5 w-5 text-brand-primary mr-2" />
              Weekly Feature Splits
            </h3>

            <div className="bg-bg-card border border-border-dark rounded-2xl p-5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-5 pointer-events-none w-48 h-48 bg-purple-500 rounded-full blur-2xl" />
              
              <p className="text-2xs text-text-secondary leading-relaxed">
                Commit to building **just one small feature block daily** during your evening coding hour:
              </p>

              <div className="space-y-3 pt-2">
                {WEEKLY_FEATURES.map((feat) => {
                  const uniqueId = `daily_feat_${feat.day}`;
                  const isDone = progress.completedItems.includes(uniqueId);
                  return (
                    <div 
                      key={feat.day}
                      onClick={() => toggleItem(uniqueId)}
                      className={`p-3 rounded-xl border flex items-start space-x-2.5 transition-all text-xs cursor-pointer select-none ${
                        isDone 
                          ? 'bg-brand-primary/5 border-brand-primary/30 opacity-70 text-text-secondary' 
                          : 'bg-bg-dark/40 border-border-dark/60 hover:border-brand-primary/20 text-white'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-brand-primary flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-4.5 w-4.5 text-text-secondary flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="text-[10px] font-black uppercase text-brand-primary block">
                          {feat.day}
                        </span>
                        <span className={`font-semibold block mt-0.5 ${isDone ? 'line-through' : ''}`}>
                          {feat.task}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick timeline outcomes */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              Expected Outcomes
            </h3>
            
            <div className="bg-bg-card border border-border-dark rounded-xl p-4 space-y-3">
              {[
                { duration: '30 Days', outcome: 'Strong Python core & algorithms' },
                { duration: '60 Days', outcome: 'FastAPI Rest API architecture' },
                { duration: '90 Days', outcome: 'Vector indexing & RAG applications' },
                { duration: '180 Days', outcome: 'Stateful multi-agent workflows' },
                { duration: '270 Days', outcome: 'Production AI cloud microservices' },
                { duration: '365 Days', outcome: 'Commercial AI SaaS Portfolio launched' }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs py-2 first:pt-0 last:pb-0 border-b last:border-0 border-border-dark/40">
                  <span className="font-extrabold text-white">{item.duration}</span>
                  <span className="text-2xs text-text-secondary text-right">{item.outcome}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
