import PageShell from '../components/PageShell';

interface Props {
  onBack: () => void;
}

export default function LearningPage({ onBack }: Props) {
  return (
    <PageShell title="Learning" subtitle="Goals and practice progress" onBack={onBack}>
      <p className="text-[13px] text-white/35">
        Learning goals and practice tracking will appear here.
      </p>
    </PageShell>
  );
}
