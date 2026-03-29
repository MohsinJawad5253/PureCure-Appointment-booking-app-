import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinicApi';
import { StatCard, LoadingSpinner, EmptyState } from '../components/ui/StatCard';
import { 
  Calendar, 
  IndianRupee, 
  Users, 
  Star, 
  TrendingUp, 
  Activity,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await clinicApi.dashboard();
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState message="Failed to load dashboard data." />;

  const statusPieData = Object.entries(data.status_breakdown || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    value
  }));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-gray-500 font-medium">Monitoring clinic performance at a glance</p>
        </div>
        <div className="px-4 py-2 bg-white border border-gray-100 rounded-2xl flex items-center shadow-sm">
           <Calendar className="w-4 h-4 text-primary mr-2" />
           <span className="text-sm font-bold text-gray-700">{new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Today's Appointments" 
          value={data.today.total} 
          icon={Calendar} 
          bgColor="bg-blue-50" 
          textColor="text-blue-600" 
          trend={{ value: '12%', isUp: true }}
        />
        <StatCard 
          title="Monthly Revenue" 
          value={`\u20B9${data.this_month.revenue.toLocaleString('en-IN')}`} 
          icon={IndianRupee} 
          bgColor="bg-emerald-50" 
          textColor="text-emerald-600"
          trend={{ value: '8%', isUp: true }}
        />
        <StatCard 
          title="Unique Patients" 
          value={data.this_month.unique_patients} 
          icon={Users} 
          bgColor="bg-primary/5" 
          textColor="text-primary"
        />
        <StatCard 
          title="Average Rating" 
          value={`${data.all_time.average_rating} \u2605`} 
          icon={Star} 
          bgColor="bg-amber-50" 
          textColor="text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-bold text-gray-900 flex items-center">
               <TrendingUp className="w-5 h-5 mr-3 text-primary" />
               Appointment Trends
             </h2>
             <div className="flex space-x-2">
                <span className="px-3 py-1 bg-primary/5 text-primary text-xs font-bold rounded-full">Last 6 Months</span>
             </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }} 
                />
                <Bar 
                  dataKey="count" 
                  fill="#E8184A" 
                  radius={[8, 8, 0, 0]} 
                  barSize={40}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
          <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center">
             <Activity className="w-5 h-5 mr-3 text-emerald-500" />
             Status Breakdown
          </h2>
          <div className="h-[300px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                   verticalAlign="bottom" 
                   align="center"
                   iconType="circle"
                   wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-gray-900">{data.this_month.total}</span>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">MTD Appts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <ClipboardList className="w-5 h-5 mr-3 text-blue-500" />
            Today's Stats Summary
          </h2>
          <div className="space-y-4">
             {[
               { label: 'Upcoming', count: data.today.upcoming, color: 'text-blue-600', bg: 'bg-blue-50' },
               { label: 'Completed', count: data.today.completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
               { label: 'Cancelled', count: data.today.cancelled, color: 'text-red-600', bg: 'bg-red-50' }
             ].map((item) => (
               <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                 <span className="font-bold text-gray-700">{item.label}</span>
                 <span className={`px-4 py-1 rounded-full font-extrabold ${item.bg} ${item.color}`}>{item.count}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <UserCheck className="w-5 h-5 mr-3 text-purple-500" />
            All-Time Retention
          </h2>
          <div className="space-y-4">
             {[
               { label: 'Total Unique Patients', count: data.all_time.total_patients, color: 'text-purple-600', bg: 'bg-purple-50' },
               { label: 'Total Consultations', count: data.all_time.total_appointments, color: 'text-primary', bg: 'bg-primary/5' },
               { label: 'Available Doctors', count: data.all_time.total_doctors, color: 'text-indigo-600', bg: 'bg-indigo-50' }
             ].map((item) => (
               <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                 <span className="font-bold text-gray-700">{item.label}</span>
                 <span className={`px-4 py-1 rounded-full font-extrabold ${item.bg} ${item.color}`}>{item.count.toLocaleString()}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
