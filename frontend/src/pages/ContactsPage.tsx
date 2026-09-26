import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Contact } from '../types';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Linkedin,
  Building2,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('Recruiter');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [notes, setNotes] = useState('');

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<Contact[]>(`/contacts${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setContacts(res || []);
    } catch (err) {
      console.error('Failed to load contacts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await apiRequest('/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          companyName: companyName.trim() || undefined,
          role: role.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          linkedIn: linkedIn.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      setName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setLinkedIn('');
      setNotes('');
      setIsModalOpen(false);
      fetchContacts();
    } catch (err: any) {
      alert(err.message || 'Failed to add contact');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/contacts/${id}`, { method: 'DELETE' });
      fetchContacts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete contact');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Recruiter Contacts</h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain your network of hiring managers, headhunters, and referral contacts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts by name, company, email, or role..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Contacts Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description="Add recruiter contacts or associate them with job applications."
          actionLabel="+ Add New Contact"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center font-bold text-sm text-indigo-300">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-100">{c.name}</h3>
                      <span className="text-[11px] text-indigo-400 font-medium">
                        {c.role || 'Recruiter'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Delete Contact"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Company / App Tag */}
                {c.company && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                    <Building2 size={13} className="text-slate-500" />
                    <span>{c.company.name}</span>
                  </div>
                )}

                {/* Contact methods */}
                <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-slate-500 shrink-0" />
                      <a href={`mailto:${c.email}`} className="hover:text-indigo-300 underline truncate">
                        {c.email}
                      </a>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-500 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.linkedIn && (
                    <div className="flex items-center gap-2">
                      <Linkedin size={13} className="text-slate-500 shrink-0" />
                      <a href={c.linkedIn} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                </div>

                {c.notes && (
                  <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed">
                    "{c.notes}"
                  </p>
                )}
              </div>

              {c.application && (
                <button
                  onClick={() => navigate(`/applications/${c.application!.id}`)}
                  className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <span>Linked: {c.application.jobTitle}</span>
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Recruiter Contact"
        subtitle="Save recruiter or hiring manager contact details"
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Microsoft"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Role / Title</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Technical Recruiter"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@company.com"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 019-2831"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">LinkedIn URL</label>
            <input
              type="url"
              value={linkedIn}
              onChange={(e) => setLinkedIn(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Referred by Alex; prefers email over phone..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white font-medium rounded-lg"
            >
              Save Contact
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
