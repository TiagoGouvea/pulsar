import { useCallback, useEffect, useState } from 'react';
import { deleteEntry } from '../data/entries';
import { listIndicatorEntries, type HistoryEntry } from '../data/entryHistory';
import type { StoredIndicator as Indicator } from '../data/indicators';
import { Button, EmptyState, Icon, IndicatorLabel, Sheet } from '../design';
import { formatDate, formatTime } from '../lib/time';
import { entryValueLabel } from './entryValue';

interface EntryHistorySheetProps {
  /** Indicator whose records are shown (null closes the sheet). */
  indicator: Indicator | null;
  uid: string;
  onClose: () => void;
}

/**
 * History of the records of an indicator (spec 5.2 and 5.3): each record shows the date and the
 * time in the browser timezone, the recorded value and the optional observation, revealed only
 * when the user asks for it. A record can be deleted (with confirmation) but never edited.
 */
export function EntryHistorySheet({ indicator, uid, onClose }: EntryHistorySheetProps) {
  const indicatorId = indicator?.id ?? null;
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null);
  const [revealedNotes, setRevealedNotes] = useState<ReadonlySet<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!indicatorId) return;
    setLoading(true);
    try {
      setEntries(await listIndicatorEntries(uid, indicatorId));
      setError(null);
    } catch {
      setError('Não foi possível carregar o histórico. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [indicatorId, uid]);

  useEffect(() => {
    if (!indicatorId) return;
    setRevealedNotes(new Set());
    void load();
  }, [indicatorId, load]);

  function toggleNote(entryId: string) {
    setRevealedNotes((current) => {
      const next = new Set(current);
      if (!next.delete(entryId)) next.add(entryId);
      return next;
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      await deleteEntry(uid, target.id);
      setEntries((current) => current.filter((entry) => entry.id !== target.id));
      setPendingDelete(null);
      setError(null);
    } catch {
      setError('Não foi possível excluir o registro. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Sheet
        open={indicator !== null}
        onClose={onClose}
        title="Histórico de registros"
        description="Data e hora no fuso do seu navegador. Registros não podem ser editados."
      >
        <div className="flex flex-col gap-space-md pb-2">
          {indicator && (
            <div className="flex items-center gap-2">
              <IndicatorLabel indicator={indicator} variant="badge" group={indicator.group} />
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {entries.length} {entries.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-md bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container"
            >
              {error}
            </p>
          )}

          {loading && (
            <p role="status" className="font-body-md text-body-md text-on-surface-variant">
              Carregando registros…
            </p>
          )}

          {!loading && entries.length === 0 && (
            <EmptyState
              icon="history"
              title="Nenhum registro ainda"
              description="Os registros deste indicador vão aparecer aqui, com data e hora."
            />
          )}

          <ul className="flex flex-col gap-space-sm">
            {entries.map((entry) => {
              const noteRevealed = revealedNotes.has(entry.id);
              return (
                <li
                  key={entry.id}
                  data-testid="history-entry"
                  className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex w-16 shrink-0 flex-col items-start">
                      <span className="font-headline-md text-headline-md text-on-surface">
                        {formatTime(entry.recordedAt)}
                      </span>{' '}
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {formatDate(entry.recordedAt)}
                      </span>
                    </div>{' '}
                    <span className="min-w-0 flex-1 truncate font-label-lg text-label-lg text-on-surface">
                      {entryValueLabel(
                        indicator ?? { valueType: entry.valueType, numeric: null, options: null },
                        entry.value,
                      )}
                    </span>
                    <div className="flex shrink-0 items-center">
                      {entry.note && (
                        <button
                          type="button"
                          aria-label={noteRevealed ? 'Ocultar observação' : 'Ver observação'}
                          aria-expanded={noteRevealed}
                          onClick={() => toggleNote(entry.id)}
                          className="flex size-11 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
                        >
                          <Icon name="notes" className="text-[18px]" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Excluir registro"
                        onClick={() => setPendingDelete(entry)}
                        className="flex size-11 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-error"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                  {noteRevealed && entry.note && (
                    <p
                      data-privacy-allow
                      className="rounded-md bg-surface-container px-3 py-2 font-body-sm text-body-sm text-on-surface-variant"
                    >
                      {entry.note}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Sheet>

      <Sheet
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Excluir registro"
        description="Esta ação não pode ser desfeita."
      >
        <div className="flex flex-col gap-2 pb-2">
          <Button variant="neutral" fullWidth onClick={() => setPendingDelete(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon="delete"
            fullWidth
            disabled={deleting}
            onClick={() => void confirmDelete()}
          >
            Excluir registro
          </Button>
        </div>
      </Sheet>
    </>
  );
}
