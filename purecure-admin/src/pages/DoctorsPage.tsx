import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinicApi';
import { LoadingSpinner, EmptyState } from '../components/ui/StatCard';
import { 
  Stethoscope, 
  Star, 
  Calendar, 
  CheckCircle2, 
  IndianRupee, 
  Award,
  ChevronRight,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await clinicApi.doctors();
        setDoctors(res.data.data.doctors);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (doctors.length === 0) return <EmptyState message="No doctors found for this clinic." />;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Medical Practitioners</h1>
          <p className="text-gray-500 font-medium">Performance monitoring and specialized metrics per doctor</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {doctors.map((d: any) => (
          <div key={d.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col group overflow-hidden transition-all hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-primary/5">
             <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex items-center space-x-6">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-2xl font-black text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                   {d.full_name.split(' ').pop().charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 leading-tight">{d.full_name}</h3>
                  <div className="flex items-center mt-1">
                      <div className="flex items-center text-amber-500 mr-2">
                        <Star className="w-3.5 h-3.5 fill-current mr-1" />
                        <span className="text-xs font-black">{d.rating}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d.review_count} Reviews</span>
                  </div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-2">{d.specialty}</p>
                  {d.clinics && d.clinics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {d.clinics.map((clinic: any) => (
                        <span key={clinic.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                          {clinic.name}
                          {clinic.is_primary && (
                            <Star className="w-2.5 h-2.5 ml-1 fill-gray-400 text-gray-400" />
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
             </div>

             <div className="p-8 space-y-6 flex-1">
                <div className="grid grid-cols-3 gap-4">
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total</p>
                      <p className="text-lg font-black text-gray-900">{d.total_appointments}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Done</p>
                      <p className="text-lg font-black text-emerald-600">{d.completed_appointments}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rate</p>
                      <p className="text-lg font-black text-blue-600">
                        {d.total_appointments > 0 ? Math.round((d.completed_appointments/d.total_appointments)*100) : 0}%
                      </p>
                   </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                   <div className="flex items-center text-gray-600">
                      <IndianRupee className="w-4 h-4 mr-2 opacity-50" />
                      <span className="text-sm font-bold">Revenue</span>
                   </div>
                   <span className="text-lg font-black text-gray-900">₹{d.revenue_generated.toLocaleString()}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${d.is_available ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {d.is_available ? 'Active Schedule' : 'Inactive'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                    {d.years_experience} YRS EXP
                  </span>
                </div>
             </div>

             <div className="px-8 pb-8 pt-2">
                <Link
                  to={`/reviews?doctor_id=${d.id}`}
                  className="w-full flex items-center justify-center p-4 rounded-2xl bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 hover:text-primary transition-all active:scale-[0.98] group-hover:border-primary/30"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Reviews
                  <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
                </Link>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
