import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  FileText,
  FlaskConical,
  Plus,
  Check,
  X,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import {
  getPartSubtask,
  updateResearchData,
  addResearchMethod,
  updateResearchMethod,
  deleteResearchMethod,
  updatePartSubtask,
  toggleSubtaskFocus,
  updateSubtaskTime,
  togglePartSubtask,
} from '@/lib/projects';
import type { MethodResultStatus, ResearchMethod, PartSubtask } from '@/data';

interface Props {
  projectId: string;
  partId: string;
  subtaskId: string;
  onBack: () => void;
}

export default function ResearchPage({ projectId, partId, subtaskId, onBack }: Props) {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [partName, setPartName] = useState('');
  const [subtask, setSubtask] = useState<PartSubtask | null>(null);

  // Form states
  const [question, setQuestion] = useState('');
  const [investigationLog, setInvestigationLog] = useState('');
  const [newMethodContent, setNewMethodContent] = useState('');
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [editingMethodText, setEditingMethodText] = useState('');
  const [editingNotesMethodId, setEditingNotesMethodId] = useState<string | null>(null);
  const [methodNotesInput, setMethodNotesInput] = useState('');
  const [editingTime, setEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState('');

  const refreshData = () => {
    const target = getPartSubtask(projectId, partId, subtaskId);
    if (target) {
      setProjectName(target.project.name);
      setPartName(target.stage.name);
      setSubtask(target.subtask);
      setQuestion(target.subtask.research?.question || target.subtask.title || '');
      setInvestigationLog(target.subtask.research?.investigationLog || '');
      setTimeInput(target.subtask.time || '');
    }
    setDataLoaded(true);
  };

  const handleToggleFocus = () => {
    toggleSubtaskFocus(projectId, partId, subtaskId);
    refreshData();
  };

  const handleToggleDone = () => {
    togglePartSubtask(projectId, partId, subtaskId);
    refreshData();
  };

  const handleSaveTime = (newTime: string) => {
    updateSubtaskTime(projectId, partId, subtaskId, newTime);
    setEditingTime(false);
    refreshData();
  };

  useEffect(() => {
    refreshData();
  }, [projectId, partId, subtaskId]);

  if (!dataLoaded || !subtask) {
    return (
      <PageShell title="Research" onBack={onBack}>
        <div className="py-24 text-center text-white/40 text-xs">Research task not found</div>
      </PageShell>
    );
  }

  const methods: ResearchMethod[] = subtask.research?.methods || [];
  const successCount = methods.filter((m) => m.status === 'success').length;
  const failureCount = methods.filter((m) => m.status === 'failure').length;

  // Auto-save question
  const handleSaveQuestion = (newQ: string) => {
    setQuestion(newQ);
    updateResearchData(projectId, partId, subtaskId, { question: newQ });
    updatePartSubtask(projectId, partId, subtaskId, { title: newQ.trim() || subtask.title });
  };

  // Auto-save investigation log
  const handleSaveInvestigationLog = (newLog: string) => {
    setInvestigationLog(newLog);
    updateResearchData(projectId, partId, subtaskId, { investigationLog: newLog });
  };

  // Add new method
  const handleAddMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodContent.trim()) return;
    addResearchMethod(projectId, partId, subtaskId, newMethodContent.trim());
    setNewMethodContent('');
    refreshData();
  };

  // Update method status (untried, success, failure)
  const handleSetStatus = (methodId: string, status: MethodResultStatus) => {
    updateResearchMethod(projectId, partId, subtaskId, methodId, { status });
    refreshData();
  };

  // Save edited method content
  const handleSaveMethodContent = (methodId: string) => {
    if (!editingMethodText.trim()) return;
    updateResearchMethod(projectId, partId, subtaskId, methodId, {
      content: editingMethodText.trim(),
    });
    setEditingMethodId(null);
    refreshData();
  };

  // Save method notes
  const handleSaveMethodNotes = (methodId: string) => {
    updateResearchMethod(projectId, partId, subtaskId, methodId, {
      notes: methodNotesInput.trim(),
    });
    setEditingNotesMethodId(null);
    refreshData();
  };

  // Delete method
  const handleDeleteMethod = (methodId: string) => {
    deleteResearchMethod(projectId, partId, subtaskId, methodId);
    refreshData();
  };

  return (
    <PageShell
      title="Research & Investigation"
      subtitle={`${projectName} • Part: ${partName}`}
      onBack={onBack}
    >
      <div className="max-w-xl mx-auto space-y-6 pb-28">
        {/* Navigation Breadcrumb / Quick Back */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Part: {partName}</span>
          </button>

          {successCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 size={12} />
              <span>{successCount} Success Identified</span>
            </span>
          )}
        </div>

        {/* Subtask Status & Focus / Timeline Bar */}
        <div className="glass glass-glow rounded-2xl p-3.5 border border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleDone}
              className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                subtask.done
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'border-white/30 hover:border-white/60 bg-white/5 text-transparent'
              }`}
            >
              <Check size={12} strokeWidth={3} className={subtask.done ? 'block' : 'hidden'} />
            </button>
            <span className={`text-xs font-medium ${subtask.done ? 'line-through text-white/40' : 'text-white/90'}`}>
              {subtask.done ? 'Completed' : 'In Progress'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Today's Focus toggle */}
            <button
              type="button"
              onClick={handleToggleFocus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                subtask.in_today_focus
                  ? 'bg-purple-500/25 border border-purple-500/40 text-purple-200'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles size={12} className={subtask.in_today_focus ? 'fill-purple-300 text-purple-300' : ''} />
              <span>{subtask.in_today_focus ? "Today's Focus: Active" : "+ Add to Today's Focus"}</span>
            </button>

            {/* Timeline time button / inline editor */}
            {!editingTime ? (
              <button
                type="button"
                onClick={() => setEditingTime(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                  subtask.time
                    ? 'bg-sky-500/20 border border-sky-500/35 text-sky-200 hover:bg-sky-500/30'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:text-sky-300 hover:bg-sky-500/10'
                }`}
              >
                <Clock size={12} className="text-sky-400" />
                <span>{subtask.time ? `Scheduled: ${subtask.time}` : '+ Schedule Time'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-white/10 border border-sky-400/40 rounded-xl px-2 py-1">
                <Clock size={12} className="text-sky-400" />
                <input
                  type="time"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveTime(timeInput)}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-sky-600 hover:bg-sky-500 text-white font-medium"
                >
                  Save
                </button>
                {subtask.time && (
                  <button
                    type="button"
                    onClick={() => handleSaveTime('')}
                    className="px-1.5 py-0.5 rounded-md text-[10px] text-rose-300 hover:text-white hover:bg-rose-500/20"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingTime(false)}
                  className="p-1 text-white/40 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            1. RESEARCH QUESTION (研究问题)
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-5 border border-indigo-500/20 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-indigo-200">
                <HelpCircle size={14} className="text-indigo-400" />
                <span>Research Question</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-white/40">Core Problem</span>
          </div>

          <div>
            <textarea
              rows={2}
              value={question}
              onChange={(e) => handleSaveQuestion(e.target.value)}
              placeholder="What core problem or hypothesis are you investigating?"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 resize-none font-medium leading-relaxed"
            />
            <p className="text-[11px] text-white/40 mt-1 pl-1">
              Define the precise technical blocker, unknown behavior, or performance goal.
            </p>
          </div>
        </div>

        {/* =====================================================================
            2. INVESTIGATION LOG (调查记录)
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-5 border border-sky-500/20 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sky-200">
                <FileText size={14} className="text-sky-400" />
                <span>Investigation Log</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-white/40">Notes & Findings</span>
          </div>

          <div>
            <textarea
              rows={4}
              value={investigationLog}
              onChange={(e) => handleSaveInvestigationLog(e.target.value)}
              placeholder="Document observed behaviors, documentation references, stack traces, hypotheses, or benchmark notes..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs text-white/90 placeholder-white/30 focus:outline-none focus:border-sky-400 resize-none leading-relaxed font-light min-h-[100px]"
            />
            <p className="text-[11px] text-white/40 mt-1 pl-1">
              All findings are automatically saved to your local workspace.
            </p>
          </div>
        </div>

        {/* =====================================================================
            3. TRIAL METHODS (尝试方法列表)
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-5 border border-purple-500/20 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-purple-200">
                <FlaskConical size={14} className="text-purple-400" />
                <span>Trial Methods ({methods.length})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-white/50">
              {failureCount > 0 && <span className="text-rose-400">{failureCount} Failed</span>}
              {successCount > 0 && <span className="text-emerald-400">{successCount} Succeeded</span>}
            </div>
          </div>

          {/* Add Method Form */}
          <form onSubmit={handleAddMethod} className="flex items-center gap-2">
            <input
              type="text"
              value={newMethodContent}
              onChange={(e) => setNewMethodContent(e.target.value)}
              placeholder="Add candidate method or approach to try..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
            />
            <button
              type="submit"
              disabled={!newMethodContent.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-medium transition-all disabled:opacity-30 shrink-0"
            >
              <Plus size={14} />
              <span>Add Method</span>
            </button>
          </form>

          {/* Methods List */}
          {methods.length > 0 ? (
            <div className="space-y-3 pt-1">
              {methods.map((method, idx) => {
                const isSuccess = method.status === 'success';
                const isFailure = method.status === 'failure';
                const isUntried = method.status === 'untried';
                const isEditingThis = editingMethodId === method.id;
                const isEditingNotes = editingNotesMethodId === method.id;

                return (
                  <div
                    key={method.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSuccess
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                        : isFailure
                        ? 'bg-rose-950/15 border-rose-500/25 text-rose-100/90'
                        : 'bg-white/[0.03] border-white/10 text-white/90'
                    }`}
                  >
                    {/* Method Header & Content */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5 bg-white/10 text-white/60">
                          {idx + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          {!isEditingThis ? (
                            <p
                              onClick={() => {
                                setEditingMethodId(method.id);
                                setEditingMethodText(method.content);
                              }}
                              title="Click to edit method text"
                              className={`text-xs font-medium leading-relaxed cursor-pointer hover:underline ${
                                isFailure ? 'text-rose-200/90' : isSuccess ? 'text-emerald-200' : 'text-white'
                              }`}
                            >
                              {method.content}
                            </p>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={editingMethodText}
                                onChange={(e) => setEditingMethodText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveMethodContent(method.id)}
                                className="flex-1 bg-white/10 border border-purple-400 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveMethodContent(method.id)}
                                className="p-1 rounded-lg bg-purple-600/40 text-purple-200"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMethodId(null)}
                                className="p-1 rounded-lg text-white/40 hover:text-white"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delete Method Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteMethod(method.id)}
                        className="p-1 rounded-lg text-white/30 hover:text-rose-300 transition-colors shrink-0"
                        title="Delete method"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Method Status Selector (Untried / Success / Failure) */}
                    <div className="flex items-center gap-1.5 pt-2 pb-1 border-t border-white/5">
                      <span className="text-[10px] font-mono text-white/40 mr-1">Result:</span>

                      {/* Untried Button */}
                      <button
                        type="button"
                        onClick={() => handleSetStatus(method.id, 'untried')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all ${
                          isUntried
                            ? 'bg-white/15 text-white border border-white/30 font-medium'
                            : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        <Clock size={11} />
                        <span>Untried</span>
                      </button>

                      {/* Success Button */}
                      <button
                        type="button"
                        onClick={() => handleSetStatus(method.id, 'success')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all ${
                          isSuccess
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-medium'
                            : 'bg-emerald-500/5 text-emerald-400/50 hover:text-emerald-300 hover:bg-emerald-500/15 border border-emerald-500/10'
                        }`}
                      >
                        <CheckCircle2 size={11} />
                        <span>Success</span>
                      </button>

                      {/* Failure Button */}
                      <button
                        type="button"
                        onClick={() => handleSetStatus(method.id, 'failure')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all ${
                          isFailure
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 font-medium'
                            : 'bg-rose-500/5 text-rose-400/50 hover:text-rose-300 hover:bg-rose-500/15 border border-rose-500/10'
                        }`}
                      >
                        <XCircle size={11} />
                        <span>Failure</span>
                      </button>
                    </div>

                    {/* Optional Method Notes */}
                    <div className="pt-2">
                      {!isEditingNotes ? (
                        <div
                          onClick={() => {
                            setEditingNotesMethodId(method.id);
                            setMethodNotesInput(method.notes || '');
                          }}
                          className="cursor-pointer text-[11px] text-white/50 hover:text-white/80 transition-colors"
                        >
                          {method.notes ? (
                            <p className="italic bg-black/20 px-2.5 py-1.5 rounded-xl border border-white/5">
                              Note: {method.notes}
                            </p>
                          ) : (
                            <span className="text-[10px] text-white/30 hover:underline">
                              + Add notes/observations for this method
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Why it succeeded or failed, test output..."
                            value={methodNotesInput}
                            onChange={(e) => setMethodNotesInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveMethodNotes(method.id)}
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveMethodNotes(method.id)}
                            className="p-1 rounded-lg bg-sky-600/40 text-sky-200 text-xs"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNotesMethodId(null)}
                            className="p-1 rounded-lg text-white/40 hover:text-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-white/30 text-xs font-mono">
              No methods listed yet. Add hypotheses or tools to test without pressure.
            </div>
          )}
        </div>

        {/* =====================================================================
            4. RETURN TO PART ACTION
            ===================================================================== */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-medium bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>Return to {partName}</span>
          </button>

          {successCount > 0 && (
            <span className="text-[11px] font-mono text-emerald-300/80">
              ✓ Ready to proceed with verified method
            </span>
          )}
        </div>
      </div>
    </PageShell>
  );
}
