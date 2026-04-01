import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';

const CATEGORIES = ['Marketing', 'Product', 'Customer', 'Admin', 'Development', 'Other'];
const PRIORITIES = [
  { value: 'high', label: 'High', color: 'badge-red' },
  { value: 'medium', label: 'Medium', color: 'badge-orange' },
  { value: 'low', label: 'Low', color: 'badge-gray' },
];

export default function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', category: 'Marketing', priority: 'medium' });
  const [aiPrioritizing, setAiPrioritizing] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [filter, setFilter] = useState('active');
  const [error, setError] = useState('');

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const t = await api.tasks.getAll();
      setTasks(t);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addTask() {
    if (!newTask.title.trim()) return;
    try {
      const t = await api.tasks.create(newTask);
      setTasks(prev => [...prev, t]);
      setNewTask({ title: '', description: '', category: 'Marketing', priority: 'medium' });
      setAdding(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleTask(task) {
    try {
      const updated = await api.tasks.update(task.id, { completed: !task.completed });
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(id) {
    try {
      await api.tasks.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function aiPrioritize() {
    const activeTasks = tasks.filter(t => !t.completed);
    if (activeTasks.length === 0) return;
    setAiPrioritizing(true);
    setError('');
    try {
      const { prioritized } = await api.claude.prioritizeTasks(activeTasks, aiContext);
      // Apply priority order to tasks
      const priorityMap = {};
      prioritized.forEach(p => { priorityMap[p.id] = p; });
      setTasks(prev => prev.map(t => {
        if (priorityMap[t.id]) {
          return {
            ...t,
            aiPriority: priorityMap[t.id].priority,
            aiReason: priorityMap[t.id].reason,
          };
        }
        return t;
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setAiPrioritizing(false);
    }
  }

  const filteredTasks = tasks
    .filter(t => filter === 'active' ? !t.completed : filter === 'completed' ? t.completed : true)
    .sort((a, b) => {
      if (a.aiPriority && b.aiPriority) return a.aiPriority - b.aiPriority;
      if (a.aiPriority) return -1;
      if (b.aiPriority) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const activeCt = tasks.filter(t => !t.completed).length;
  const completedCt = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="section-title">✅ Tasks</h2>
          <p className="text-xs text-slate-500 mt-0.5">{activeCt} active · {completedCt} done</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setAdding(a => !a)}>
            + Add Task
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Add task form */}
      {adding && (
        <div className="card p-4 border-brand-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200 text-sm">New Task</span>
            <button className="text-slate-500 hover:text-slate-300" onClick={() => setAdding(false)}>✕</button>
          </div>
          <input
            className="input text-sm"
            placeholder="Task title *"
            value={newTask.title}
            onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            autoFocus
          />
          <textarea
            className="input text-sm"
            placeholder="Description (optional)"
            rows={2}
            value={newTask.description}
            onChange={e => setNewTask(n => ({ ...n, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label block mb-1">Category</label>
              <select className="input text-sm" value={newTask.category} onChange={e => setNewTask(n => ({ ...n, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label block mb-1">Priority</label>
              <select className="input text-sm" value={newTask.priority} onChange={e => setNewTask(n => ({ ...n, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm flex-1" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn-primary text-sm flex-1" onClick={addTask} disabled={!newTask.title.trim()}>Add Task</button>
          </div>
        </div>
      )}

      {/* AI Prioritize */}
      <div className="card p-4 border-brand-800 bg-brand-900/10">
        <div className="flex items-center gap-2 mb-2">
          <span>🤖</span>
          <span className="text-sm font-medium text-brand-300">AI Prioritization</span>
        </div>
        <div className="flex gap-2">
          <input
            className="input text-xs flex-1"
            placeholder="Context (e.g. 'investor meeting tomorrow')"
            value={aiContext}
            onChange={e => setAiContext(e.target.value)}
          />
          <button
            className="btn-primary text-xs px-3"
            onClick={aiPrioritize}
            disabled={aiPrioritizing || activeCt === 0}
          >
            {aiPrioritizing ? '...' : 'Prioritize'}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1">Claude will rank your active tasks by business impact.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
        {[['active', 'Active'], ['completed', 'Completed'], ['all', 'All']].map(([val, label]) => (
          <button
            key={val}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              filter === val ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="card p-4 h-16 animate-pulse" />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          {filter === 'active' ? (
            <>
              <div className="text-3xl mb-2">🎯</div>
              <p>No active tasks. Add one to get started!</p>
              <p className="text-xs mt-1 text-slate-600">Tip: Focus on marketing tasks first — you're pre-launch.</p>
            </>
          ) : 'No tasks here.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => {
            const priority = PRIORITIES.find(p => p.value === task.priority);
            return (
              <div
                key={task.id}
                className={`card p-3 flex items-start gap-3 transition-opacity ${task.completed ? 'opacity-50' : ''} ${task.aiPriority === 1 ? 'border-brand-600' : ''}`}
              >
                {/* Checkbox */}
                <button
                  className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                    task.completed
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'border-slate-600 hover:border-brand-500'
                  }`}
                  onClick={() => toggleTask(task)}
                >
                  {task.completed && <span className="text-xs">✓</span>}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {task.aiPriority && <span className="text-xs text-brand-400 font-bold mr-1">#{task.aiPriority}</span>}
                      {task.title}
                    </span>
                    {priority && !task.completed && (
                      <span className={`badge ${priority.color} text-xs`}>{priority.label}</span>
                    )}
                    {task.category && (
                      <span className="badge badge-gray text-xs">{task.category}</span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                  )}
                  {task.aiReason && !task.completed && (
                    <p className="text-xs text-brand-500 mt-1 italic">🤖 {task.aiReason}</p>
                  )}
                  <p className="text-xs text-slate-700 mt-1">
                    Added {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                <button
                  className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0 text-xs px-1"
                  onClick={() => deleteTask(task.id)}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
