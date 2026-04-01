import { useState } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from 'date-fns';

import { clinicApi } from '../api/clinicApi';
import { generateClinicReport } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

const today = new Date();

// Date preset definitions
const DATE_PRESETS = [
  {
    label: 'Today',
    getRange: () => ({
      from: format(today, 'yyyy-MM-dd'),
      to: format(today, 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'This Week',
    getRange: () => ({
      from: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'This Month',
    getRange: () => ({
      from: format(startOfMonth(today), 'yyyy-MM-dd'),
      to: format(endOfMonth(today), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Last Month',
    getRange: () => ({
      from: format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
      to: format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Last 3 Months',
    getRange: () => ({
      from: format(subMonths(today, 3), 'yyyy-MM-dd'),
      to: format(today, 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'This Year',
    getRange: () => ({
      from: format(startOfYear(today), 'yyyy-MM-dd'),
      to: format(today, 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'All Time',
    getRange: () => ({
      from: '2020-01-01',
      to: format(today, 'yyyy-MM-dd'),
    }),
  },
] as const;

export default function ReportsPage() {
  // Default preset: All Time (so the first preview isn't "today" with empty data)
  const defaultRange = DATE_PRESETS.find(p => p.label === 'All Time')!.getRange();

  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [activePreset, setActivePreset] = useState('All Time');

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasData, setHasData] = useState(false);

  const applyPreset = (preset: typeof DATE_PRESETS[number]) => {
    const range = preset.getRange();
    setDateFrom(range.from);
    setDateTo(range.to);
    setActivePreset(preset.label);
    setReportData(null);
    setHasData(false);
  };

  // Fetch report data ONLY on button click
  const handlePreview = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Please select a date range');
      return;
    }
    if (dateFrom > dateTo) {
      toast.error('Start date must be before end date');
      return;
    }

    setLoading(true);
    setReportData(null);
    setHasData(false);

    try {
      console.log('Fetching report with params:', { date_from: dateFrom, date_to: dateTo });
      const res = await clinicApi.reportData({ date_from: dateFrom, date_to: dateTo });
      console.log('Report API raw response:', res.data);

      // Backend response wrapper: { success, message, data: { ... } }
      const data = res.data?.data ?? res.data;
      console.log('Extracted data:', data);

      if (!data) {
        toast.error('No data returned from server');
        return;
      }

      setReportData(data);
      setHasData(true);

      const total = data.summary?.total_appointments ?? 0;
      if (total === 0) {
        toast(`No appointments found between ${dateFrom} and ${dateTo}. Try "All Time" or a wider range.`, {
          duration: 5000,
        });
      } else {
        toast.success(`Report loaded: ${total} appointment(s) found`);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ??
        err.message ??
        'Failed to fetch report data';
      toast.error(msg);
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!reportData) {
      toast.error('Please preview report data first');
      return;
    }

    setGenerating(true);
    try {
      generateClinicReport(reportData);
      toast.success('PDF downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + (err?.message ?? 'Unknown error'));
      console.error('PDF generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure and export high-fidelity PDF performance reports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Configuration ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Report Period
            </h2>
          </div>

          {/* Date inputs */}
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setActivePreset('');
                  setReportData(null);
                  setHasData(false);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setActivePreset('');
                  setReportData(null);
                  setHasData(false);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Quick Presets
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    activePreset === preset.label
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview button */}
          <button
            onClick={handlePreview}
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading Report Data...' : 'Preview Report Data'}
          </button>
        </div>

        {/* ── RIGHT: Preview + Generate ───────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          {!hasData && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Ready to compile?
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Select a date range and click "Preview Report Data" to load analytics before generating the PDF.
              </p>
              <p className="text-xs text-gray-300">
                Tip: Try "All Time" if your data is from earlier dates.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="animate-spin h-10 w-10 text-primary-500 mb-4 rounded-full border-4 border-gray-200 border-t-primary-500" />
              <p className="text-gray-500 text-sm">Fetching report data...</p>
            </div>
          )}

          {hasData && reportData && (
            <div className="flex-1 flex flex-col">
              {/* Report header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Report Preview</h3>
                <span className="text-xs text-primary-500 font-semibold uppercase tracking-wide">
                  Print Ready Audit
                </span>
              </div>

              {/* No appointments warning */}
              {(reportData.summary?.total_appointments ?? 0) === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
                  <p className="font-semibold text-amber-800 mb-1">
                    No appointments in this date range
                  </p>
                  <p className="text-amber-700 text-xs">
                    This clinic may have appointments outside this range. Try "All Time" or widen the date range, then click Preview again.
                  </p>
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  {
                    label: 'Total Appts',
                    value: reportData.summary?.total_appointments ?? 0,
                  },
                  {
                    label: 'Completion',
                    value: `${reportData.summary?.completion_rate ?? 0}%`,
                  },
                  {
                    label: 'Revenue',
                    value: `₹${Number(reportData.summary?.total_revenue ?? 0).toLocaleString('en-IN')}`,
                  },
                  {
                    label: 'Patients',
                    value: reportData.summary?.unique_patients ?? 0,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-gray-50 rounded-lg p-3 text-center"
                  >
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      {stat.label}
                    </p>
                    <p className="text-lg font-bold text-gray-800">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Doctor summary */}
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Practitioner Summary
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(reportData.doctor_breakdown ?? []).map((d: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs flex-shrink-0">
                        {d.name?.charAt?.(0) ?? '-'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {d.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {d.completed} Sessions
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">
                          ₹{Number(d.revenue ?? 0).toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-green-500">
                          {d.average_rating}★
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate PDF button */}
              <button
                onClick={handleGeneratePDF}
                disabled={generating}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
              >
                {generating ? 'Generating PDF...' : '⬇ Generate & Export Complete PDF Report'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* What's in the report info card */}
      <div className="mt-6 bg-primary-50 border border-primary-100 rounded-2xl p-5">
        <h3 className="font-semibold text-primary-700 mb-3">What's in the Report?</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            'Executive Summary with key metrics',
            'Doctor Performance Breakdown table',
            'Patient Rating Analysis',
            'Top 10 Patients by visit count',
            'Complete Appointment Log',
            'PureCure branding + clinic details',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-primary-700">
              <span className="text-primary-500 mt-0.5 flex-shrink-0">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
