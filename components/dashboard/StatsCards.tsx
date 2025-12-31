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
        icon={<FileText className="h-6 w-6 text-blue-600" />}
        label="Total Uploads"
        value={stats.totalUploads.toString()}
        subtitle="All time"
        bgColor="bg-blue-50"
      />

      {/* Completed */}
      <StatCard
        icon={<CheckCircle className="h-6 w-6 text-green-600" />}
        label="Completed"
        value={stats.completed.toString()}
        subtitle="Successfully processed"
        bgColor="bg-green-50"
      />

      {/* Processing */}
      <StatCard
        icon={<Clock className="h-6 w-6 text-amber-600" />}
        label="Processing"
        value={stats.processing.toString()}
        subtitle="In queue"
        bgColor="bg-amber-50"
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  bgColor: string;
}

function StatCard({ icon, label, value, subtitle, bgColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <div className={`${bgColor} p-2 rounded-lg`}>{icon}</div>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
