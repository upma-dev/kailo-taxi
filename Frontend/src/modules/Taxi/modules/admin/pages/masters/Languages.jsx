import React, { useState, useEffect } from 'react';
import { Plus, Search, Globe, Trash2, ChevronRight, Loader2, Edit2, X } from 'lucide-react';
import { adminService } from '../../services/adminService';

const StatusToggle = ({ active, onToggle }) => (
  <button
    onClick={onToggle}
    className={`w-9 h-5 rounded-full transition-colors relative ${active ? 'bg-indigo-600' : 'bg-gray-300'}`}
  >
    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${active ? 'left-[18px]' : 'left-0.5'}`} />
  </button>
);

const LanguageModal = ({ language, onClose, onSaved }) => {
  const isEdit = Boolean(language);
  const [name, setName] = useState(language?.name || '');
  const [code, setCode] = useState(language?.code || '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(!isEdit);
  const [query, setQuery] = useState('');

  // Adding: the list of languages comes from the API; the admin just picks one.
  useEffect(() => {
    if (isEdit) return undefined;
    let cancelled = false;
    adminService
      .getAvailableLanguages()
      .then((response) => {
        const payload = response?.data?.data || response?.data || response;
        if (!cancelled) setCatalog(Array.isArray(payload?.results) ? payload.results : []);
      })
      .catch((err) => {
        if (!cancelled) setFormError(err?.response?.data?.message || err?.message || 'Failed to load languages');
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => { cancelled = true; };
  }, [isEdit]);

  const filteredCatalog = catalog.filter((item) => {
    const q = query.trim().toLowerCase();
    return !q || item.name.toLowerCase().includes(q) || item.native_name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setFormError('Name and code are required');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { name: name.trim(), code: code.trim().toLowerCase() };
      if (isEdit) await adminService.updateLanguage(language._id || language.id, payload);
      else await adminService.createLanguage(payload);
      onSaved();
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save language');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Language' : 'Add Language'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {isEdit ? (
          <>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">Code *</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </>
        ) : (
          <>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">Choose a language *</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search language..."
              className="mb-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
              {catalogLoading ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">Loading languages...</p>
              ) : filteredCatalog.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">No languages found</p>
              ) : (
                filteredCatalog.map((item) => {
                  const selected = code === item.code;
                  return (
                    <button
                      type="button"
                      key={item.code}
                      onClick={() => { setName(item.name); setCode(item.code); }}
                      className={`flex w-full items-center justify-between border-b border-gray-100 px-4 py-2.5 text-left text-sm last:border-none hover:bg-gray-50 ${selected ? 'bg-indigo-50' : ''}`}
                    >
                      <span>
                        <span className="font-medium text-gray-900">{item.name}</span>
                        <span className="ml-2 text-gray-400">{item.native_name}</span>
                      </span>
                      <span className="text-xs font-semibold uppercase text-gray-400">{item.code}</span>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
        {formError ? <p className="mb-3 text-sm text-red-500">{formError}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Languages = () => {
  const [modal, setModal] = useState(null); // null | { language?: object }
  const [languages, setLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLanguages = async () => {
    try {
      setIsLoading(true);
      const response = await adminService.getLanguages();
      const data = response?.paginator?.data || response?.results || (Array.isArray(response) ? response : []);
      setLanguages(data);
      setError(null);
    } catch (err) {
      console.error('Fetch Languages Error:', err);
      setError('Failed to fetch languages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLanguages(); }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await adminService.updateLanguageStatus(id, { active: currentStatus ? 0 : 1 });
      fetchLanguages();
    } catch (err) {
      console.error('Toggle Status Error:', err);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await adminService.updateLanguage(id, { default_status: 1 });
      fetchLanguages();
    } catch (err) {
      console.error('Set Default Error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this language?')) {
      try {
        await adminService.deleteLanguage(id);
        fetchLanguages();
      } catch (err) {
        console.error('Delete Error:', err);
      }
    }
  };

  const filtered = languages.filter(l =>
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
        <span>Masters</span>
        <ChevronRight size={12} />
        <span className="text-gray-700">Languages</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Languages</h1>
        <button onClick={() => setModal({})} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> Add Language
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <select className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <span>entries</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-56 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-400">Loading languages...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={fetchLanguages} className="text-xs text-indigo-600 underline">Retry</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Default</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length > 0 ? filtered.map((lang, idx) => (
                <tr key={lang._id || lang.id || idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{lang.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{lang.code}</td>
                  <td className="px-6 py-4">
                    {lang.default_status === 1 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">Default</span>
                    ) : (
                      <button onClick={() => handleSetDefault(lang._id || lang.id)} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">Set as Default</button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusToggle
                      active={lang.active === 1}
                      onToggle={() => handleToggleStatus(lang._id || lang.id, lang.active === 1)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setModal({ language: lang })} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={15} />
                      </button>
                      {lang.default_status !== 1 && (
                        <button
                          onClick={() => handleDelete(lang._id || lang.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-sm text-gray-400">
                    No languages found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Showing 1 to {filtered.length} of {filtered.length} entries</span>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 hover:text-gray-600 transition-colors">Prev</button>
              <button className="w-7 h-7 rounded bg-indigo-600 text-white text-xs font-medium">1</button>
              <button className="px-3 py-1.5 hover:text-gray-600 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
      {modal ? (
        <LanguageModal
          language={modal.language}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchLanguages(); }}
        />
      ) : null}
    </div>
  );
};

export default Languages;
