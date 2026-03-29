import React, { useState, useEffect, useCallback } from 'react';
import { clinicApi } from '../api/clinicApi';
import { LoadingSpinner, EmptyState } from '../components/ui/StatCard';
import { generateClinicReport } from '../utils/pdfGenerator';
import { 
  FileText, 
  Calendar, 
  Download, 
  ChevronRight, 
  LayoutDashboard, 
  Stethoscope, 
  TrendingUp,
  Award,
  Users
} from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  startOfMonth, 
  subMonths, 
  startOfYear, 
  endOfMonth 
} from 'date-fns';
import toast from 'react-hot-toast';

const today = new Date();

const presets = {
  'Today': {
    from: format(today, 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  },
  'This Week': {
    from: format(startOfWeek(today), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  },
  'This Month': {
    from: format(startOfMonth(today), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  },
  'Last Month': {
    from: format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
    to: format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
  },
  'Last 3 Months': {
    from: format(subMonths(today, 3), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  },
  'This Year': {
    from: format(startOfYear(today), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  },
  /** Wide range so historical DB data (any year) is included */
  'All time': {
    from: '2000-01-01',
    to: format(today, 'yyyy-MM-dd'),
  },
};

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(presets['All time'].from);
  const [dateTo, setDateTo] = useState(presets['All time'].to);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchReportData = useCallback(async (options?: { notify?: boolean }) => {
    const notify = options?.notify !== false;
    setLoading(true);
    setReportData(null);
    try {
      const res = await clinicApi.reportData({ date_from: dateFrom, date_to: dateTo });
      setReportData(res.data.data);
      if (notify) toast.success('Report metrics loaded');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch report metrics');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchReportData({ notify: false });
    // Intentionally once on mount (uses initial All time range); user refreshes via Preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreset = (presetName: keyof typeof presets) => {
    const preset = presets[presetName];
    setDateFrom(preset.from);
    setDateTo(preset.to);
  };

  const handeGeneratePDF = async () => {
    if (!reportData) return;
    setGenerating(true);
    toast.loading('Generating your PDF report...', { id: 'pdf' });
    
    try {
      // Simulate slight delay for better UX
      await new Promise(r => setTimeout(r, 1200));
      generateClinicReport(reportData);
      toast.success('PDF downloaded successfully!', { id: 'pdf' });
    } catch (err) {
      console.error('PDF Generation Error:', err);
      toast.error('Failed to generate PDF', { id: 'pdf' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-gray-500 font-medium">Configure and export high-fidelity PDF performance reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 space-y-8 animate-in slide-in-from-left duration-700">
              <h2 className="text-sm font-black text-gray-900 flex items-center mb-6 uppercase tracking-widest">
                <Calendar className="w-5 h-5 mr-3 text-primary" />
                Report Period
              </h2>

              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-gray-400 capitalize tracking-widest block mb-2">From Date</label>
                    <input
                       type="date"
                       value={dateFrom}
                       onChange={(e) => setDateFrom(e.target.value)}
                       className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 capitalize tracking-widest block mb-2">To Date</label>
                    <input
                       type="date"
                       value={dateTo}
                       onChange={(e) => setDateTo(e.target.value)}
                       className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
                    />
                 </div>
              </div>

              <div className="pt-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Quick Presets</p>
                 <div className="grid grid-cols-2 gap-2">
                    {Object.keys(presets).map((name) => (
                      <button
                        key={name}
                        onClick={() => handlePreset(name as keyof typeof presets)}
                        className="px-3 py-2.5 rounded-xl border border-gray-100 bg-white hover:bg-primary/5 hover:border-primary/30 transition-all text-[11px] font-black text-gray-600 hover:text-primary active:scale-95"
                      >
                        {name}
                      </button>
                    ))}
                 </div>
              </div>

              <button
                onClick={() => fetchReportData({ notify: true })}
                disabled={loading}
                className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Crunching Numbers...' : 'Preview Report Data'}
              </button>
           </div>

           <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 relative overflow-hidden group">
              <Award className="absolute -bottom-6 -right-6 w-32 h-32 text-primary/5 group-hover:scale-110 transition-transform duration-700" />
              <div className="relative">
                <h3 className="text-xl font-black text-primary mb-4 leading-tight">What's in the Report?</h3>
                <ul className="space-y-4">
                  {[
                    'Executive Performance Summary',
                    'Doctor Contribution Breakdown',
                    'Patient Loyalty & Retention Stats',
                    'Rating Distribution Analysis',
                    'Complete Full Audit Log'
                  ].map(t => (
                    <li key={t} className="flex items-center text-xs font-bold text-primary/70">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary mr-3" />
                       {t}
                    </li>
                  ))}
                </ul>
              </div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-8 animate-in slide-in-from-right duration-700">
           {!reportData && !loading && (
             <div className="bg-white p-20 rounded-[2.5rem] border border-dashed border-gray-200 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                   <FileText className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Ready to compile?</h3>
                <p className="text-gray-400 font-medium max-w-xs mx-auto">Click "Preview Report Data" to load analytics before generating the professional PDF.</p>
             </div>
           )}

           {loading && <LoadingSpinner />}

           {reportData && (
             <div className="space-y-8">
               <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-gray-900">Report Preview</h2>
                    <span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/5 rounded-full uppercase tracking-tighter shadow-sm shadow-primary/10">
                      Print Ready Audit
                    </span>
                  </div>

                  {reportData.summary?.total_appointments === 0 &&
                    (reportData.report_meta?.clinic_appointments_total ?? 0) > 0 && (
                    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                      <p className="font-bold">No appointments in this date range</p>
                      <p className="mt-1 text-amber-900/90">
                        This clinic has{' '}
                        <span className="font-semibold">
                          {reportData.report_meta.clinic_appointments_total}
                        </span>{' '}
                        appointment
                        {reportData.report_meta.clinic_appointments_total === 1 ? '' : 's'} on file
                        {reportData.report_meta.data_earliest_date &&
                          reportData.report_meta.data_latest_date && (
                            <>
                              {' '}
                              (between {reportData.report_meta.data_earliest_date} and{' '}
                              {reportData.report_meta.data_latest_date})
                            </>
                          )}
                        . Use the <span className="font-semibold">All time</span> preset or widen the
                        range, then click Preview again.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                     {[
                       { label: 'Total Appts', val: reportData.summary?.total_appointments ?? 0, icon: ClipboardListIcon },
                       { label: 'Completion', val: `${reportData.summary?.completion_rate ?? 0}%`, icon: TrendingUp },
                       { label: 'Revenue', val: `\u20B9${Number(reportData.summary?.total_revenue ?? 0).toLocaleString()}`, icon: TrendingUp },
                       { label: 'Patients', val: reportData.summary?.unique_patients ?? 0, icon: Users }
                     ].map(s => (
                       <div key={s.label} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                          <p className="text-lg font-black text-gray-900">{s.val}</p>
                       </div>
                     ))}
                  </div>

                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Practitioner Summary</p>
                     <div className="space-y-3">
                        {reportData.doctor_breakdown.slice(0, 3).map((d: any) => (
                          <div key={d.name} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl transition-all hover:border-primary/30">
                             <div className="flex items-center space-x-3">
                               <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                                 {d.name.split(' ').pop().charAt(0)}
                               </div>
                               <div>
                                 <p className="text-sm font-extrabold text-gray-800">{d.name}</p>
                                 <p className="text-[10px] text-gray-400 font-bold">{d.total_appointments} Sessions</p>
                               </div>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-black text-gray-900">₹{d.revenue.toLocaleString()}</p>
                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{d.average_rating}★</p>
                             </div>
                          </div>
                        ))}
                        {reportData.doctor_breakdown.length > 3 && (
                          <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest py-2">
                             And {reportData.doctor_breakdown.length - 3} more practitioners...
                          </p>
                        )}
                     </div>
                  </div>
               </div>

               <div className="bg-white p-2 border border-gray-100 rounded-[2.5rem] shadow-2xl shadow-primary/20">
                  <button
                    onClick={handeGeneratePDF}
                    disabled={generating}
                    className="w-full bg-primary hover:bg-primary-600 text-white font-black py-6 rounded-[2rem] transition-all flex items-center justify-center space-x-4 shadow-xl shadow-primary/30 active:scale-[0.98]"
                  >
                    <Download className={`w-6 h-6 ${generating ? 'animate-bounce' : 'animate-pulse'}`} />
                    <span className="text-lg tracking-tight">Generate & Export Complete PDF Report</span>
                  </button>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

const ClipboardListIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
