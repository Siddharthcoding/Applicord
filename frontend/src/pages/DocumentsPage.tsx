import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { DocumentItem } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import {
  FileText,
  Download,
  Trash2,
  Building2,
  ExternalLink,
} from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<DocumentItem[]>('/documents');
      setDocuments(res || []);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this document?')) return;
    try {
      await apiRequest(`/documents/${id}`, { method: 'DELETE' });
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Document Vault</h1>
        <p className="text-xs text-slate-400 mt-1">
          Submitted resumes, cover letters, application PDFs, and offer letters attached to your applications.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading documents...</div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents uploaded yet"
          description="You can upload submitted resumes, cover letters, and offer letters directly on any application detail page."
        />
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/80 shadow-sm">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{doc.name}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="uppercase text-indigo-300 font-semibold">{doc.documentCategory}</span>
                    <span>•</span>
                    <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>

                  {doc.application && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mt-1">
                      <Building2 size={12} className="text-slate-500" />
                      <span>{doc.application.company.name} ({doc.application.jobTitle})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {doc.application && (
                  <button
                    onClick={() => navigate(`/applications/${doc.application!.id}`)}
                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                    title="View Linked Application"
                  >
                    <ExternalLink size={15} />
                  </button>
                )}
                <a
                  href={`http://localhost:5000${doc.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Delete Document"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
