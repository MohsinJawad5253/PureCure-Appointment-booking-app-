import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clinicApi } from '../api/clinicApi';
import { LoadingSpinner, EmptyState } from '../components/ui/StatCard';
import { 
  Star, 
  User, 
  Stethoscope, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  MessageCircle,
  Award
} from 'lucide-react';
import { format } from 'date-fns';

export default function ReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const filters = {
    doctor_id: searchParams.get('doctor_id') || '',
    rating: searchParams.get('rating') || '',
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await clinicApi.reviews({ ...filters, page });
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
    fetchReviews();
  }, [filters.doctor_id, filters.rating, page]);

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    setSearchParams(newParams);
    setPage(1);
  };

  if (loading && !data) return <LoadingSpinner />;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Patient Feedback</h1>
          <p className="text-gray-500 font-medium">Monitoring service quality and doctor ratings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 text-center">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Overall Rating</h2>
              <div className="text-6xl font-black text-gray-900 leading-none mb-4">{data?.average_rating || '0.0'}</div>
              <div className="flex items-center justify-center space-x-1 text-amber-500 mb-6">
                 {[1, 2, 3, 4, 5].map(s => (
                   <Star key={s} className={`w-5 h-5 ${s <= Math.round(data?.average_rating || 0) ? 'fill-current' : ''}`} />
                 ))}
              </div>
              
              <div className="space-y-3">
                 {[5, 4, 3, 2, 1].map(r => {
                   const count = data?.rating_breakdown?.[String(r)] || 0;
                   const pct = data?.count ? (count / data.count) * 100 : 0;
                   return (
                     <div key={r} className="flex items-center text-xs font-bold">
                        <span className="w-8 text-left text-gray-600">{r} ★</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full mx-2 overflow-hidden">
                           <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-gray-400">{count}</span>
                     </div>
                   );
                 })}
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 space-y-6">
              <h3 className="text-sm font-bold text-gray-900 flex items-center">
                <Filter className="w-4 h-4 mr-2 text-primary" />
                Filters
              </h3>
              <div className="space-y-4">
                 <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Filter by Doctor</label>
                   <select
                     value={filters.doctor_id}
                     onChange={(e) => handleFilterChange('doctor_id', e.target.value)}
                     className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
                   >
                     <option value="">All Doctors</option>
                     {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Star Rating</label>
                   <select
                     value={filters.rating}
                     onChange={(e) => handleFilterChange('rating', e.target.value)}
                     className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
                   >
                     <option value="">All Ratings</option>
                     {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                   </select>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
           {data?.results.map((r: any) => (
             <div key={r.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 group hover:shadow-2xl transition-all hover:bg-gray-50/50">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                   <div className="flex items-start space-x-6">
                      <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
                         {r.is_anonymous ? <User className="w-6 h-6 text-gray-400" /> : <div className="text-xl font-black text-primary">{r.patient_name.charAt(0)}</div>}
                      </div>
                      <div className="space-y-2">
                         <div className="flex items-center space-x-3">
                            <span className="font-black text-gray-900">{r.patient_name}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="text-xs font-bold text-gray-400">{format(new Date(r.created_at), 'dd MMM yyyy')}</span>
                         </div>
                         <div className="flex space-x-0.5 text-amber-500">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-current' : 'opacity-20'}`} />)}
                         </div>
                         <p className="text-gray-600 font-medium leading-relaxed italic">"{r.comment || 'No comment provided.'}"</p>
                      </div>
                   </div>

                   <div className="sm:text-right shrink-0">
                      <div className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl">
                         <Stethoscope className="w-3.5 h-3.5 mr-2 text-primary" />
                         <div className="text-left">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Reviewed</p>
                            <p className="text-xs font-bold text-gray-900">{r.doctor_name}</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           ))}

           {(!data || data.results.length === 0) && !loading && <EmptyState message="No reviews found matching these filters." />}

           {data && data.total_pages > 1 && (
             <div className="flex items-center justify-center space-x-4 pt-6">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-3 rounded-2xl border border-gray-200 bg-white hover:border-primary disabled:opacity-30 transition-all active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Page {page} / {data.total_pages}
                </div>
                <button
                  disabled={page === data.total_pages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-3 rounded-2xl border border-gray-200 bg-white hover:border-primary disabled:opacity-30 transition-all active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
