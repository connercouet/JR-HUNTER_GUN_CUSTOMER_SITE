import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm

function getWeekDates(offset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + (offset * 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function CalendarPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ summary: '', description: '', date: '', startTime: '09:00', endTime: '10:00' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const weekDates = getWeekDates(weekOffset);

  useEffect(() => {
    loadEvents();
  }, [weekOffset]);

  async function loadEvents() {
    setLoading(true);
    setError('');
    try {
      const timeMin = weekDates[0].toISOString();
      const timeMax = new Date(weekDates[6]);
      timeMax.setHours(23, 59, 59);
      const { events: evts } = await api.google.calendar.getEvents({
        timeMin,
        timeMax: timeMax.toISOString(),
        limit: 50,
      });
      setEvents(evts || []);
    } catch (err) {
      setError(err.message.includes('not connected') ? 'Connect your Google account to view calendar.' : err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createEvent() {
    if (!newEvent.summary || !newEvent.date) return;
    setSaving(true);
    try {
      const start = new Date(`${newEvent.date}T${newEvent.startTime}:00`).toISOString();
      const end = new Date(`${newEvent.date}T${newEvent.endTime}:00`).toISOString();
      await api.google.calendar.createEvent({ ...newEvent, start, end });
      setSuccess('Event created!');
      setCreating(false);
      setNewEvent({ summary: '', description: '', date: '', startTime: '09:00', endTime: '10:00' });
      loadEvents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function getEventsForDay(date) {
    return events.filter(e => {
      const d = new Date(e.start?.dateTime || e.start?.date);
      return d.toDateString() === date.toDateString();
    });
  }

  const today = new Date();

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="section-title">📅 Calendar</h2>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setWeekOffset(0)}>Today</button>
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
          <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setCreating(true)}>+ Event</button>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-amber-800 bg-amber-900/10 text-amber-300 text-sm">
          {error}
          {error.includes('Connect') && <a href="/api/google/auth" className="ml-2 underline">Connect Google →</a>}
        </div>
      )}

      {success && (
        <div className="card p-3 border-green-800 bg-green-900/20 text-green-300 text-sm">{success}</div>
      )}

      {/* Create Event Form */}
      {creating && (
        <div className="card p-4 border-brand-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200">New Event</span>
            <button className="text-slate-500 hover:text-slate-300" onClick={() => setCreating(false)}>✕</button>
          </div>
          <input className="input text-sm" placeholder="Event title *" value={newEvent.summary} onChange={e => setNewEvent(n => ({ ...n, summary: e.target.value }))} />
          <input className="input text-sm" type="date" value={newEvent.date} onChange={e => setNewEvent(n => ({ ...n, date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label block mb-1">Start</label>
              <input className="input text-sm" type="time" value={newEvent.startTime} onChange={e => setNewEvent(n => ({ ...n, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="label block mb-1">End</label>
              <input className="input text-sm" type="time" value={newEvent.endTime} onChange={e => setNewEvent(n => ({ ...n, endTime: e.target.value }))} />
            </div>
          </div>
          <textarea className="input text-sm" placeholder="Description (optional)" rows={2} value={newEvent.description} onChange={e => setNewEvent(n => ({ ...n, description: e.target.value }))} />
          <div className="flex gap-2">
            <button className="btn-secondary text-sm flex-1" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn-primary text-sm flex-1" onClick={createEvent} disabled={saving}>{saving ? 'Creating...' : 'Create Event'}</button>
          </div>
        </div>
      )}

      {/* Week label */}
      <div className="text-sm text-slate-400 text-center">
        Week of {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        {weekOffset === 0 && <span className="ml-2 badge badge-green">This Week</span>}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="card p-8 text-center text-slate-500 text-sm">Loading calendar...</div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {weekDates.map((date, i) => (
            <div
              key={i}
              className={`text-center py-2 rounded-lg text-xs font-medium ${
                date.toDateString() === today.toDateString()
                  ? 'bg-brand-500/20 text-brand-300'
                  : 'text-slate-500'
              }`}
            >
              <div>{DAYS[date.getDay()]}</div>
              <div className={`text-base font-bold font-serif mt-0.5 ${date.toDateString() === today.toDateString() ? 'text-brand-400' : 'text-slate-300'}`}>
                {date.getDate()}
              </div>
            </div>
          ))}

          {/* Event cells */}
          {weekDates.map((date, i) => {
            const dayEvents = getEventsForDay(date);
            return (
              <div key={i} className={`min-h-[120px] p-1 rounded-lg border ${date.toDateString() === today.toDateString() ? 'border-brand-700 bg-brand-900/10' : 'border-slate-800 bg-slate-900/30'}`}>
                {dayEvents.map((evt, j) => (
                  <div
                    key={j}
                    className="mb-1 p-1.5 rounded bg-brand-600/30 border border-brand-600/40 text-xs text-brand-200 leading-tight"
                    title={evt.description || evt.summary}
                  >
                    <div className="font-medium truncate">{evt.summary}</div>
                    {evt.start?.dateTime && (
                      <div className="text-brand-400 mt-0.5">
                        {new Date(evt.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming events list */}
      <div>
        <h3 className="section-title mb-3">Upcoming Events</h3>
        {events.length === 0 ? (
          <div className="card p-4 text-sm text-slate-500 text-center">No events this week.</div>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 10).map((evt, i) => {
              const start = new Date(evt.start?.dateTime || evt.start?.date);
              const isToday = start.toDateString() === today.toDateString();
              return (
                <div key={i} className={`card p-3 flex items-start gap-3 ${isToday ? 'border-brand-700' : ''}`}>
                  <div className="text-center min-w-[40px]">
                    <div className="text-xs text-slate-500">{start.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-lg font-bold font-serif text-brand-400">{start.getDate()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">{evt.summary}</div>
                    {evt.start?.dateTime && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {evt.end?.dateTime && ` → ${new Date(evt.end.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                      </div>
                    )}
                    {evt.description && <div className="text-xs text-slate-600 mt-0.5 truncate">{evt.description}</div>}
                  </div>
                  {isToday && <span className="badge badge-green text-xs">Today</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
