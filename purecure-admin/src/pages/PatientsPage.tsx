import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clinicApi } from '../api/clinicApi';
import { LoadingSpinner, EmptyState } from '../components/ui/StatCard';
import { Search, User, ChevronLeft, ChevronRight, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await clinicApi.patients({ search, page });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(fetchPatients, 500);
    return () => clearTimeout(timeout);
  }, [search, page]);

  if (loading && !data) return <LoadingSpinner />;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Patients Database</h1>
          <p className="text-gray-500 font-medium">Manage and view patient history across the clinic</p>
        </div>
        
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Patient</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Demographics</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Visits</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Last Visit</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.results.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold">
                        {p.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{p.full_name}</p>
                        <p className="text-xs text-gray-400 font-medium">ID: {p.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-600 text-sm">
                        <Mail className="w-3.5 h-3.5 mr-2 opacity-60" />
                        {p.email}
                      </div>
                      <div className="flex items-center text-gray-600 text-sm">
                        <Phone className="w-3.5 h-3.5 mr-2 opacity-60" />
                        {p.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-700 capitalize">{p.gender || '—'}</p>
                      <p className="text-xs text-gray-400 font-medium whitespace-nowrap">
                        {p.date_of_birth ? format(new Date(p.date_of_birth), 'dd MMM yyyy') : 'No DOB'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-extrabold shadow-sm shadow-emerald-600/10">
                      {p.visit_count}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                     <p className="text-sm font-bold text-gray-700">
                       {p.last_visit ? format(new Date(p.last_visit), 'dd MMM yyyy') : 'Never'}
                     </p>
                     {p.upcoming_count > 0 && (
                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mt-1">
                          {p.upcoming_count} Scheduled
                        </p>
                     )}
                  </td>
                  <td className="px-6 py-5">
                    <Link
                      to={`/patients/${p.id}`}
                      className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-primary hover:text-primary transition-all active:scale-95 shadow-sm"
                    >
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!data || data.results.length === 0) && !loading && (
          <div className="py-20 text-center">
            <EmptyState message="No patients matching your search criteria." />
          </div>
        )}

        {data && data.total_pages > 1 && (
          <div className="p-6 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
              Page {page} of {data.total_pages}
            </p>
            <div className="flex space-x-3">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={page === data.total_pages}
                onClick={() => setPage(p => p + 1)}
                className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-all active:scale-95"
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
