import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';

const STATUSES = [
  { value: 'lead', label: 'Lead', color: 'badge-gray' },
  { value: 'interested', label: 'Interested', color: 'badge-blue' },
  { value: 'testing', label: 'Testing', color: 'badge-orange' },
  { value: 'advocate', label: 'Advocate', color: 'badge-green' },
];

const SOURCES = ['Google Form', 'Email', 'Instagram', 'Facebook', 'Referral', 'Trade Show', 'Other'];

export default function CustomerPipeline() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const emptyForm = { name: '', email: '', phone: '', source: 'Google Form', status: 'lead', ageOfChild: '', notes: '', location: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const c = await api.customers.getAll();
      setCustomers(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function saveCustomer() {
    if (!form.name.trim()) return;
    try {
      if (selected && selected.id) {
        const updated = await api.customers.update(selected.id, form);
        setCustomers(prev => prev.map(c => c.id === selected.id ? updated : c));
        setSuccess('Customer updated!');
      } else {
        const c = await api.customers.create(form);
        setCustomers(prev => [...prev, c]);
        setSuccess('Customer added!');
      }
      setAdding(false);
      setSelected(null);
      setForm(emptyForm);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(customer, status) {
    try {
      const updated = await api.customers.update(customer.id, { status });
      setCustomers(prev => prev.map(c => c.id === customer.id ? updated : c));
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCustomer(id) {
    try {
      await api.customers.delete(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      setSelected(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function editCustomer(customer) {
    setForm({ ...emptyForm, ...customer });
    setSelected(customer);
    setAdding(true);
  }

  const filtered = filter === 'all' ? customers : customers.filter(c => c.status === filter);

  const stats = STATUSES.map(s => ({
    ...s,
    count: customers.filter(c => c.status === s.value).length,
  }));

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="section-title">👥 Customer Pipeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">{customers.length} total contacts</p>
        </div>
        <button
          className="btn-primary text-xs px-3 py-1.5"
          onClick={() => { setForm(emptyForm); setSelected(null); setAdding(a => !a); }}
        >
          + Add Contact
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</div>
      )}
      {success && (
        <div className="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">{success}</div>
      )}

      {/* Pipeline stats */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(({ value, label, color, count }) => (
          <button
            key={value}
            className={`card p-3 text-center transition-colors ${filter === value ? 'border-brand-600' : ''}`}
            onClick={() => setFilter(v => v === value ? 'all' : value)}
          >
            <div className="text-xl font-bold font-serif text-slate-100">{count}</div>
            <div className={`text-xs mt-1 badge ${color} w-full justify-center`}>{label}</div>
          </button>
        ))}
      </div>

      {/* Add/Edit form */}
      {adding && (
        <div className="card p-4 border-brand-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200 text-sm">
              {selected ? 'Edit Contact' : 'Add New Contact'}
            </span>
            <button className="text-slate-500" onClick={() => { setAdding(false); setSelected(null); setForm(emptyForm); }}>✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="label block mb-1">Name *</label>
              <input className="input text-sm" placeholder="Full name" value={form.name} onChange={e => setField('name', e.target.value)} />
            </div>
            <div>
              <label className="label block mb-1">Email</label>
              <input className="input text-sm" type="email" placeholder="email@example.com" value={form.email} onChange={e => setField('email', e.target.value)} />
            </div>
            <div>
              <label className="label block mb-1">Phone</label>
              <input className="input text-sm" placeholder="(555) 555-5555" value={form.phone} onChange={e => setField('phone', e.target.value)} />
            </div>
            <div>
              <label className="label block mb-1">Child's Age</label>
              <input className="input text-sm" placeholder="e.g. 12" value={form.ageOfChild} onChange={e => setField('ageOfChild', e.target.value)} />
            </div>
            <div>
              <label className="label block mb-1">Source</label>
              <select className="input text-sm" value={form.source} onChange={e => setField('source', e.target.value)}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label block mb-1">Status</label>
              <select className="input text-sm" value={form.status} onChange={e => setField('status', e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label block mb-1">Location</label>
              <input className="input text-sm" placeholder="City, State" value={form.location} onChange={e => setField('location', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label block mb-1">Notes</label>
              <textarea className="input text-sm" rows={2} placeholder="Notes from form, email, or conversation..." value={form.notes} onChange={e => setField('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm flex-1" onClick={() => { setAdding(false); setSelected(null); }}>Cancel</button>
            <button className="btn-primary text-sm flex-1" onClick={saveCustomer} disabled={!form.name.trim()}>
              {selected ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
        <button
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex-1 ${filter === 'all' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
          onClick={() => setFilter('all')}
        >All ({customers.length})</button>
        {STATUSES.map(s => (
          <button
            key={s.value}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex-1 ${filter === s.value ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
            onClick={() => setFilter(s.value)}
          >{s.label}</button>
        ))}
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="card p-4 h-16 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          <div className="text-3xl mb-2">👤</div>
          <p>No contacts yet. Add your Google Form respondents here!</p>
          <p className="text-xs mt-1 text-slate-600">Import from your survey emails or add manually.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => {
            const statusDef = STATUSES.find(s => s.value === customer.status) || STATUSES[0];
            return (
              <div key={customer.id} className="card p-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200">{customer.name}</span>
                    <span className={`badge ${statusDef.color} text-xs`}>{statusDef.label}</span>
                    {customer.source && <span className="badge badge-gray text-xs">{customer.source}</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex gap-3 flex-wrap">
                    {customer.email && <span>✉ {customer.email}</span>}
                    {customer.phone && <span>📞 {customer.phone}</span>}
                    {customer.ageOfChild && <span>🎯 Child age: {customer.ageOfChild}</span>}
                    {customer.location && <span>📍 {customer.location}</span>}
                  </div>
                  {customer.notes && (
                    <div className="text-xs text-slate-600 mt-1 truncate">{customer.notes}</div>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <select
                    className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
                    value={customer.status}
                    onChange={e => updateStatus(customer, e.target.value)}
                  >
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <button className="text-xs text-slate-500 hover:text-slate-200 px-2 py-1 bg-slate-800 rounded" onClick={() => editCustomer(customer)}>Edit</button>
                    <button className="text-xs text-slate-600 hover:text-red-400 px-1" onClick={() => deleteCustomer(customer.id)}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
