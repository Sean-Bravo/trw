import { FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  userId: string;
}

export async function StatsCards({ userId }: StatsCardsProps) {
  // TODO: Fetch real stats from API
  // For now, return placeholder data
  const stats = {
    totalUploads: 0,
    completed: 0,
    processing: 0,
    thisMonth: 0,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Uploads */}
      <StatCard
        icon={<FileText className="h-5 w-5" />}
        label="Total Uploads"
        value={stats.totalUploads.toString()}
        subtitle="All time"
        gradient="from-[var(--color-primary-500)] to-[var(--color-primary-600)]"
      />

      {/* Completed */}
      <StatCard
        icon={<CheckCircle className="h-5 w-5" />}
        label="Completed"
        value={stats.completed.toString()}
        subtitle="Successfully processed"
        gradient="from-[var(--color-accent-500)] to-[var(--color-accent-600)]"
      />

      {/* Processing */}
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label="Processing"
        value={stats.processing.toString()}
        subtitle="In queue"
        gradient="from-amber-500 to-orange-500"
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  gradient: string;
}

function StatCard({ icon, label, value, subtitle, gradient }: StatCardProps) {
  return (
    <div className="group bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-lg shadow-black/5 border border-white/20 dark:border-slate-700/50 p-6 hover:shadow-xl hover:shadow-[var(--color-primary-500)]/10 hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
        <div className={`bg-gradient-to-r ${gradient} p-2.5 rounded-xl text-white`}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-[var(--color-accent-500)]" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
