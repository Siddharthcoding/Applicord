import React, { useState } from 'react';
import { ApplicationStatusHistory } from '../../types';
import { StatusPill } from '../common/StatusPill';
import { HistorySourceBadge } from '../common/HistorySourceBadge';
import { CorrectStatusModal } from './CorrectStatusModal';
import { AlertCircle, Edit3, MessageSquare } from 'lucide-react';

interface TimelineViewProps {
  history: ApplicationStatusHistory[];
  onRefresh?: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ history, onRefresh }) => {
  const [correctingEvent, setCorrectingEvent] = useState<ApplicationStatusHistory | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
        No status history recorded yet.
      </div>
    );
  }

  // Sort chronological ascending and deduplicate consecutive identical status entries
  const sorted = [...history]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .filter((item, index, arr) => {
      if (index === 0) return true;
      const prev = arr[index - 1];
      if (item.status === prev.status) {
        return Boolean(item.metadata?.isCorrectionEvent);
      }
      return true;
    });

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
      {sorted.map((item) => {
        const dateStr = new Date(item.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const timeStr = new Date(item.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const isAutomated = item.source === 'EMAIL' || item.source === 'BROWSER_EXTENSION' || item.source === 'SYSTEM';
        const isCorrection = item.metadata?.isCorrectionEvent;
        const isCorrected = item.metadata?.isCorrected;

        return (
          <div key={item.id} className="relative group">
            {/* Timeline node dot */}
            <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-indigo-500 shadow-sm" />

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <StatusPill status={item.status} size="md" />
                  <HistorySourceBadge source={item.source} />
                  {isCorrection && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-medium border border-amber-800">
                      Correction Event
                    </span>
                  )}
                  {isCorrected && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium line-through">
                      Overridden
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {dateStr} • {timeStr}
                  </span>
                  {isAutomated && !isCorrected && (
                    <button
                      onClick={() => setCorrectingEvent(item)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-opacity"
                      title="Correct this automated event"
                    >
                      <Edit3 size={12} />
                      Correct
                    </button>
                  )}
                </div>
              </div>

              {/* Note / User remark */}
              {item.note && (
                <div className="text-xs text-slate-200 mt-1 flex items-start gap-1.5">
                  <MessageSquare size={13} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>{item.note}</span>
                </div>
              )}

              {/* Transparent Reason / Automation Metadata */}
              {item.metadata?.reason && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                  <AlertCircle size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-200">System Detection Reason:</span>{' '}
                    <span className="text-slate-300">{item.metadata.reason}</span>
                    {item.metadata.confidence && (
                      <span className="ml-2 text-[10px] text-indigo-400 font-mono">
                        ({Math.round(item.metadata.confidence * 100)}% confidence)
                      </span>
                    )}
                    {item.metadata.subject && (
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                        Subject: "{item.metadata.subject}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Correct Status Modal */}
      {correctingEvent && (
        <CorrectStatusModal
          isOpen={!!correctingEvent}
          onClose={() => setCorrectingEvent(null)}
          event={correctingEvent}
          onSuccess={() => {
            setCorrectingEvent(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
