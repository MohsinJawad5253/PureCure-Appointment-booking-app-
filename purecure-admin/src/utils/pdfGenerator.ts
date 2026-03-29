import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRIMARY = [232, 24, 74] as [number, number, number];
const DARK = [31, 41, 55] as [number, number, number];
const GRAY = [107, 114, 128] as [number, number, number];
const LIGHT_GRAY = [249, 250, 251] as [number, number, number];

/** jsPDF Helvetica is WinAnsi-only; avoid ₹, ★, and other non-Latin-1 chars. */
function inr(n: number): string {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

function ratingLabel(n: number | string): string {
  return `${n} / 5`;
}

function feeCell(raw: unknown): string {
  if (raw == null || raw === '') return inr(0);
  const s = String(raw);
  if (s.includes('Rs.')) return s;
  return s.replace(/₹\s*/g, 'Rs. ');
}

export function generateClinicReport(reportData: any): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const report_meta = reportData?.report_meta ?? {};
  const summary = reportData?.summary ?? {};
  const doctor_breakdown = reportData?.doctor_breakdown ?? [];
  const rating_breakdown = reportData?.rating_breakdown ?? {};
  const appointment_details = reportData?.appointment_details ?? [];
  const top_patients = reportData?.top_patients ?? [];

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 0;

  // ── COVER PAGE ─────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 45, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('PureCure', margin, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Clinic Management Platform', margin, 28);

  doc.setFontSize(10);
  doc.text(String(report_meta.clinic_name ?? ''), margin, 38);

  y = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...DARK);
  doc.text('Clinic Performance Report', margin, y);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...GRAY);
  doc.text(
    `Period: ${report_meta.date_from} to ${report_meta.date_to}`,
    margin, y
  );

  y += 6;
  doc.text(
    `Address: ${report_meta.clinic_address ?? ''}, ${report_meta.clinic_city ?? ''}`,
    margin, y
  );

  y += 6;
  doc.text(`Generated: ${report_meta.generated_at ?? ''}`, margin, y);

  y += 10;
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);

  // ── EXECUTIVE SUMMARY ─────────────────────────────────
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  doc.text('Executive Summary', margin, y);

  y += 8;

  const summaryItems = [
    { label: 'Total Appointments', value: String(summary.total_appointments ?? 0) },
    { label: 'Completed', value: String(summary.completed ?? 0) },
    { label: 'Cancelled', value: String(summary.cancelled ?? 0) },
    { label: 'No Show', value: String(summary.no_show ?? 0) },
    { label: 'Total Revenue', value: inr(Number(summary.total_revenue ?? 0)) },
    { label: 'Unique Patients', value: String(summary.unique_patients ?? 0) },
    { label: 'Completion Rate', value: `${summary.completion_rate ?? 0}%` },
    { label: 'Avg Rating', value: ratingLabel(summary.average_rating ?? 0) },
    { label: 'Total Reviews', value: String(summary.total_reviews ?? 0) },
    { label: 'Total Doctors', value: String(summary.total_doctors ?? 0) },
  ];

  const colW = (pageW - margin * 2) / 2;
  const rowH = 16;

  summaryItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * colW;
    const itemY = y + row * rowH;

    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(x + 1, itemY, colW - 2, rowH - 2, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...PRIMARY);
    doc.text(item.value, x + 6, itemY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(item.label, x + 6, itemY + 12);
  });

  y += Math.ceil(summaryItems.length / 2) * rowH + 10;

  // ── DOCTOR PERFORMANCE TABLE ───────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  doc.text('Doctor Performance', margin, y);

  y += 6;

  autoTable(doc, {
    startY: y,
    head: [[
      'Doctor', 'Specialty', 'Total Appts',
      'Completed', 'Cancelled', 'Revenue', 'Avg Rating'
    ]],
    body: doctor_breakdown.map((d: any) => [
      d.name,
      d.specialty,
      String(d.total_appointments ?? 0),
      String(d.completed ?? 0),
      String(d.cancelled ?? 0),
      inr(Number(d.revenue ?? 0)),
      ratingLabel(d.average_rating ?? 0),
    ]),
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK,
    },
    alternateRowStyles: {
      fillColor: LIGHT_GRAY,
    },
    margin: { left: margin, right: margin },
    theme: 'grid',
  });

  y = (doc as any).lastAutoTable.finalY + 14;

  if (y > 230) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  doc.text('Patient Ratings', margin, y);

  y += 8;

  const totalReviews = Math.max(1, summary.total_reviews ?? 0);
  [5, 4, 3, 2, 1].forEach((star) => {
    const count = rating_breakdown[String(star)] || 0;
    const pct = (count / totalReviews) * 100;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(`${star} stars`, margin, y + 3);
    doc.text(`${count}`, pageW - margin - 10, y + 3);

    doc.setFillColor(229, 231, 235);
    doc.roundedRect(margin + 14, y - 1, 120, 6, 1, 1, 'F');

    if (pct > 0) {
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(
        margin + 14, y - 1, (120 * pct) / 100, 6, 1, 1, 'F'
      );
    }

    y += 10;
  });

  y += 6;
  if (y > 230) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  doc.text('Top Patients by Visit Count', margin, y);

  y += 6;

  if (!top_patients.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('No patient visits in this date range.', margin, y + 4);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Patient Name', 'Email', 'Total Visits']],
      body: top_patients.map((p: any) => [
        p.name ?? '-',
        p.email ?? '-',
        String(p.visits ?? 0),
      ]),
      headStyles: {
        fillColor: PRIMARY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9, textColor: DARK },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: margin, right: margin },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  doc.addPage();
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  doc.text('Appointment Log', margin, y);

  y += 6;

  if (!appointment_details.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text('No appointments in this date range.', margin, y + 4);
  } else {
    autoTable(doc, {
      startY: y,
      head: [[
        'Date', 'Time', 'Patient',
        'Doctor', 'Specialty', 'Status', 'Fee'
      ]],
      body: appointment_details.map((a: any) => [
        a.date ?? '-',
        a.time ?? '-',
        a.patient ?? '-',
        a.doctor ?? '-',
        a.specialty ?? '-',
        a.status ?? '-',
        feeCell(a.fee),
      ]),
      headStyles: {
        fillColor: PRIMARY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: DARK },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: margin, right: margin },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.column.index === 5 && data.section === 'body') {
          const statuses = data.cell.text as string[];
          const status = statuses[0];
          if (status === 'Completed') {
            data.cell.styles.textColor = [16, 185, 129];
          } else if (status.includes('Cancelled')) {
            data.cell.styles.textColor = [239, 68, 68];
          } else if (status === 'No Show') {
            data.cell.styles.textColor = [245, 158, 11];
          }
        }
      },
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 287, pageW, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `PureCure - ${report_meta.clinic_name ?? 'Clinic'}`,
      margin, 293
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageW - margin - 20, 293
    );
  }

  const clinicSlug = String(report_meta.clinic_name ?? 'Clinic').replace(/\s+/g, '_');
  const filename =
    `PureCure_Report_${clinicSlug}_${report_meta.date_from}_to_${report_meta.date_to}.pdf`;
  doc.save(filename);
}
