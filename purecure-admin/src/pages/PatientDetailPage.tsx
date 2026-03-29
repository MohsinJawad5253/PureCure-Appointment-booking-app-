import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { clinicApi } from '../api/clinicApi';
import { LoadingSpinner, EmptyState, StatusBadge } from '../components/ui/StatCard';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Mail, 
  Phone, 
  User, 
  History,
  CreditCard,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        const res = await clinicApi.patientDetail(id);
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState message="Patient record not found." />;

  const { patient, stats, appointments } = data;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center space-x-4">
        <Link 
          to="/patients" 
          className="p-2.5 rounded-xl border border-gray-200 bg-white hover:border-primary hover:text-primary transition-all active:scale-95 shadow-sm group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div>
           <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Patient Profile</h1>
           <p className="text-gray-500 font-medium">Viewing full history for {patient.full_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-24 bg-primary/5" />
             <div className="relative pt-8 flex flex-col items-center">
               <div className="w-24 h-24 rounded-3xl bg-white border-4 border-white shadow-xl flex items-center justify-center text-4xl text-primary font-black mb-6">
                  {patient.full_name.charAt(0)}
               </div>
               <h2 className="text-2xl font-black text-gray-900 leading-tight">{patient.full_name}</h2>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Patient ID: {patient.id.slice(0, 8)}</p>
               
               <div className="mt-8 w-full space-y-4 text-left">
                  <div className="flex items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                    <div className="p-2 bg-white rounded-lg border border-gray-100 mr-4 shadow-sm group-hover:bg-primary transition-colors duration-300">
                       <Mail className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Email</p>
                       <p className="text-sm font-bold text-gray-700 truncate">{patient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                    <div className="p-2 bg-white rounded-lg border border-gray-100 mr-4 shadow-sm group-hover:bg-primary transition-colors duration-300">
                       <Phone className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Phone</p>
                       <p className="text-sm font-bold text-gray-700">{patient.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                    <div className="p-2 bg-white rounded-lg border border-gray-100 mr-4 shadow-sm group-hover:bg-primary transition-colors duration-300">
                       <User className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Gender / DOB</p>
                       <p className="text-sm font-bold text-gray-700 capitalize">
                         {patient.gender || 'Not specified'} • {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'dd MMM yyyy') : 'No DOB'}
                       </p>
                    </div>
                  </div>
               </div>
             </div>
           </div>

           <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
             <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
               <Target className="w-5 h-5 mr-3 text-emerald-500" />
               Relationship Status
             </h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-50">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Total Spent</p>
                  <p className="text-xl font-black text-emerald-600">₹{stats.total_spent.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Total Visits</p>
                  <p className="text-xl font-black text-blue-600">{stats.total_visits}</p>
                </div>
             </div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-primary/5 rounded-2xl">
                   <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">First Visit</p>
                  <p className="text-lg font-bold text-gray-800">{stats.first_visit ? format(new Date(stats.first_visit), 'dd MMM yyyy') : '—'}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                   <History className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Last Visit</p>
                  <p className="text-lg font-bold text-gray-800">{stats.last_visit ? format(new Date(stats.last_visit), 'dd MMM yyyy') : '—'}</p>
                </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
             <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Clock className="w-5 h-5 mr-3 text-primary" />
                  Appointment History
                </h3>
                <span className="px-4 py-1.5 bg-gray-100 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  {appointments.length} Total Records
                </span>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-gray-50/50 border-b border-gray-100">
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Consulting Doctor</th>
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Fee</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {appointments.map((a: any) => (
                      <tr key={a.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-8 py-6">
                           <p className="font-extrabold text-gray-900">{format(new Date(a.appointment_date), 'dd MMM yyyy')}</p>
                           <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tighter">{a.start_time.slice(0, 5)} - {a.end_time.slice(0, 5)}</p>
                        </td>
                        <td className="px-8 py-6">
                           <p className="font-bold text-gray-900">{a.doctor_name}</p>
                           <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">{a.specialty}</p>
                           {a.reason && <p className="text-xs text-gray-400 mt-2 font-medium max-w-xs">{a.reason}</p>}
                        </td>
                        <td className="px-8 py-6 text-center">
                           <StatusBadge status={a.status} />
                        </td>
                        <td className="px-8 py-6 text-right">
                           <p className="font-black text-gray-900">₹{a.consultation_fee}</p>
                        </td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                           <EmptyState message="No appointment history found for this patient." />
                        </td>
                      </tr>
                    )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
