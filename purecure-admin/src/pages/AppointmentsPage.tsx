import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinicApi';
import { LoadingSpinner, EmptyState, StatusBadge } from '../components/ui/StatCard';
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Stethoscope,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

export default function AppointmentsPage() {
  const [data, setData] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    doctor_id: '',
    search: ''
  });

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await clinicApi.appointments({ ...filters, page });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await clinicApi.doctors();
      setDoctors(res.data.data.doctors);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchAppointments, 500);
    return () => clearTimeout(timeout);
  }, [filters, page]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  if (loading && !data) return <LoadingSpinner />;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight text-primary">Appointments Log</h1>
          <p className="text-gray-500 font-medium">Track and filter all consultations across the clinic</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/10 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[240px]">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search patient name..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-sm"
            />
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-sm"
          >
            <option value="">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled_by_patient">Patient Cancelled</option>
            <option value="cancelled_by_doctor">Doctor Cancelled</option>
            <option value="no_show">No Show</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={filters.doctor_id}
            onChange={(e) => handleFilterChange('doctor_id', e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-sm"
          >
            <option value="">All Doctors</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <input
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Practitioner</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.results.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-extrabold text-gray-900">{format(new Date(a.appointment_date), 'dd MMM yyyy')}</p>
                    <p className="text-xs text-gray-400 font-black mt-1 uppercase tracking-tighter">
                       {a.start_time.slice(0, 5)} - {a.end_time.slice(0, 5)}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{a.patient_name}</p>
                        <p className="text-xs text-gray-400 font-medium">{a.patient_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                       <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                         <Stethoscope className="w-4 h-4 text-emerald-600" />
                       </div>
                       <div>
                         <p className="font-bold text-gray-900">{a.doctor_name}</p>
                         <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{a.specialty}</p>
                         {a.clinic_name && (
                           <p className="text-xs text-gray-500 mt-1 flex items-center">
                             <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-1.5"></span>
                             {a.clinic?.name || a.clinic_name}
                           </p>
                         )}
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <StatusBadge status={a.status} />
                    {a.cancellation_reason && (
                      <div className="mt-2 flex items-center justify-center text-[10px] text-red-500 font-bold max-w-[120px] mx-auto italic">
                        <Info className="w-3 h-3 mr-1 shrink-0" />
                        {a.cancellation_reason.slice(0, 40)}...
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="font-black text-gray-900">₹{a.consultation_fee}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                      {a.status === 'completed' ? 'Paid' : 'Pending'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!data || data.results.length === 0) && !loading && (
          <div className="py-20">
             <EmptyState message="No appointments matching these filters." />
          </div>
        )}

        {data && data.total_pages > 1 && (
          <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-gray-50/20">
             <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
               Page {page} / {data.total_pages}
             </p>
             <div className="flex space-x-2">
                <button
                   disabled={page === 1}
                   onClick={() => setPage(p => p - 1)}
                   className="p-2 rounded-xl border border-gray-200 bg-white hover:border-primary disabled:opacity-30 transition-all active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                   disabled={page === data.total_pages}
                   onClick={() => setPage(p => p + 1)}
                   className="p-2 rounded-xl border border-gray-200 bg-white hover:border-primary disabled:opacity-30 transition-all active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
