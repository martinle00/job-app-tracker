import { OUTCOMES, stageLabel } from '@/lib/stages';

const TONE_CLASSES: Record<string, string> = {
  active: 'bg-sky-100 text-sky-800',
  positive: 'bg-emerald-100 text-emerald-800',
  negative: 'bg-rose-100 text-rose-800',
  neutral: 'bg-amber-100 text-amber-800',
  muted: 'bg-slate-200 text-slate-700',
};

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const match = OUTCOMES.find((o) => o.id === outcome);
  const tone = match ? TONE_CLASSES[match.tone] : TONE_CLASSES.muted;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {match?.label ?? outcome}
    </span>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      {stageLabel(stage)}
    </span>
  );
}
