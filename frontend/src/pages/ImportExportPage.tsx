import React, { useState } from 'react';
import { apiRequest } from '../api/client';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const ImportExportPage: React.FC = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [mappedRows, setMappedRows] = useState<any[]>([]);
  const [validatedData, setValidatedData] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Column mappings
  const [mapping, setMapping] = useState<Record<string, string>>({
    company: '',
    jobTitle: '',
    appliedAt: '',
    status: '',
    source: '',
    location: '',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    setCsvFile(file);
    setPreviewData(null);
    setValidatedData(null);
    setImportResult(null);

    try {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest('/data/parse-csv', {
        method: 'POST',
        body: formData,
      });

      setPreviewData(res);

      // Initialize mapping with suggested mappings
      const initialMap: Record<string, string> = {
        company: '',
        jobTitle: '',
        appliedAt: '',
        status: '',
        source: '',
        location: '',
      };

      if (res.suggestedMapping) {
        Object.entries(res.suggestedMapping).forEach(([header, targetField]) => {
          if (initialMap[targetField as string] === '') {
            initialMap[targetField as string] = header;
          }
        });
      }
      setMapping(initialMap);
    } catch (err: any) {
      alert(err.message || 'Failed to parse CSV');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidateMapping = async () => {
    if (!previewData || !mapping.company || !mapping.jobTitle) {
      alert('Please map at least Company and Job Title columns.');
      return;
    }

    try {
      setIsProcessing(true);
      const rows = previewData.allRows.map((row: any) => ({
        company: row[mapping.company] || '',
        jobTitle: row[mapping.jobTitle] || '',
        appliedAt: mapping.appliedAt ? row[mapping.appliedAt] : undefined,
        status: mapping.status ? row[mapping.status] : 'APPLIED',
        source: mapping.source ? row[mapping.source] : 'IMPORT',
        location: mapping.location ? row[mapping.location] : undefined,
      }));

      setMappedRows(rows);

      const res = await apiRequest('/data/preview-import', {
        method: 'POST',
        body: JSON.stringify({ rows }),
      });

      setValidatedData(res);
    } catch (err: any) {
      alert(err.message || 'Validation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!mappedRows || mappedRows.length === 0) return;

    try {
      setIsProcessing(true);
      const res = await apiRequest('/data/execute-import', {
        method: 'POST',
        body: JSON.stringify({ rows: mappedRows }),
      });

      setImportResult(res);
      setPreviewData(null);
      setValidatedData(null);
      setCsvFile(null);
    } catch (err: any) {
      alert(err.message || 'Import execution failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = (type: 'csv' | 'json') => {
    const token = localStorage.getItem('applylog_access_token');
    const url = `http://localhost:5000/api/v1/data/export-${type}`;
    
    // Trigger download with auth token in URL or fetch blob
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `applicord-export-${new Date().toISOString().split('T')[0]}.${type}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Data Portability: Import & Export</h1>
        <p className="text-xs text-slate-400 mt-1">
          Import your spreadsheet records with live validation or export your full career dataset anytime.
        </p>
      </div>

      {/* Export Section */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
            <Download size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Export Complete Career History</h3>
            <p className="text-xs text-slate-400">
              Download your full dataset including applications, status history, recruiters, and follow-ups.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-emerald-500 text-xs font-semibold text-slate-200 transition-all shadow-sm"
          >
            <FileSpreadsheet size={15} className="text-emerald-400" />
            <span>Export Applications (.CSV)</span>
          </button>

          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-indigo-500 text-xs font-semibold text-slate-200 transition-all shadow-sm"
          >
            <FileCode size={15} className="text-indigo-400" />
            <span>Export Full Backup (.JSON)</span>
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
            <Upload size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Import Applications from CSV</h3>
            <p className="text-xs text-slate-400">
              Upload existing spreadsheet records. We will preview columns and detect duplicates before saving.
            </p>
          </div>
        </div>

        {/* Step 1: Upload File */}
        {!previewData && !validatedData && (
          <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-slate-950/40">
            <FileSpreadsheet size={32} className="text-indigo-400" />
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Choose a CSV file</span>
              <span className="text-[11px] text-slate-500">Columns: Company, Job Title, Applied Date, Status, Location, etc.</span>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
            />
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {previewData && !validatedData && (
          <div className="space-y-4 pt-2 animate-in fade-in">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Step 2: Map Your CSV Columns
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'company', label: 'Company Name *' },
                { key: 'jobTitle', label: 'Job Title / Role *' },
                { key: 'appliedAt', label: 'Date Applied' },
                { key: 'status', label: 'Current Status' },
                { key: 'source', label: 'Source (LinkedIn, etc.)' },
                { key: 'location', label: 'Location' },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">{field.label}</label>
                  <select
                    value={mapping[field.key] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
                  >
                    <option value="">-- Select Column --</option>
                    {previewData.headers.map((h: string) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 text-xs bg-slate-800 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleValidateMapping}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm"
              >
                <span>Validate & Check Duplicates</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Duplicate Preview & Confirmation */}
        {validatedData && (
          <div className="space-y-4 pt-2 animate-in fade-in">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-100 block">
                  Validation Summary: {validatedData.validRowsCount} valid rows ready to import
                </span>
                {validatedData.duplicatesCount > 0 && (
                  <span className="text-[11px] text-amber-400 font-medium">
                    ⚠️ {validatedData.duplicatesCount} potential duplicate applications detected.
                  </span>
                )}
              </div>
            </div>

            {/* Sample Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-2.5">Row</th>
                    <th className="p-2.5">Company</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Duplicate Warning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {validatedData.rows.slice(0, 10).map((r: any) => (
                    <tr key={r.rowNumber} className="hover:bg-slate-900/40">
                      <td className="p-2.5 text-slate-500">#{r.rowNumber}</td>
                      <td className="p-2.5 font-semibold text-slate-200">{r.data.company}</td>
                      <td className="p-2.5 text-slate-300">{r.data.jobTitle}</td>
                      <td className="p-2.5">
                        {r.isDuplicate ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                            Already tracked ({r.duplicateInfo?.currentStatus})
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            New Record
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setValidatedData(null)}
                className="px-4 py-2 text-xs bg-slate-800 text-slate-300 rounded-lg"
              >
                Back to Mapping
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm"
              >
                {isProcessing ? 'Importing...' : `Confirm & Import ${validatedData.validRowsCount} Applications`}
              </button>
            </div>
          </div>
        )}

        {/* Result banner */}
        {importResult && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-xs text-emerald-200 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold block">Import Complete!</span>
              <span>Successfully imported {importResult.importedCount} applications to your command center.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
