import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
}

export function StatCard({ title, value, icon: Icon, bgColor, textColor, trend }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          
          {trend && (
            <div className={`mt-2 flex items-center text-xs font-semibold ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
              <span className={`px-1.5 py-0.5 rounded-full ${trend.isUp ? 'bg-green-50' : 'bg-red-50'}`}>
                {trend.isUp ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-gray-400 ml-1.5 font-normal">vs last month</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-2xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${textColor}`} />
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    upcoming: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Upcoming' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Completed' },
    cancelled_by_patient: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Patient Cancelled' },
    cancelled_by_doctor: { bg: 'bg-red-50', text: 'text-red-600', label: 'Doctor Cancelled' },
    no_show: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'No Show' },
    in_progress: { bg: 'bg-indigo-50', text: 'text-indigo-600', label: 'In Progress' },
    rescheduled: { bg: 'bg-purple-50', text: 'text-purple-600', label: 'Rescheduled' },
  };

  const style = config[status.toLowerCase()] || { bg: 'bg-gray-50', text: 'text-gray-500', label: status };

  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 opacity-70 ${style.text.replace('text-', 'bg-')}`} />
      {style.label}
    </span>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
      <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );
}
