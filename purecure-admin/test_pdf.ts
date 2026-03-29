import { generateClinicReport } from './src/utils/pdfGenerator';

const mockData = {
    report_meta: { clinic_name: "Test", clinic_address: "A", clinic_city: "B", date_from: "2024", date_to: "2024", generated_at: "Now" },
    summary: { total_appointments: 1, completed: 1, cancelled: 0, no_show: 0, total_revenue: 100, unique_patients: 1, completion_rate: 100, average_rating: 5, total_reviews: 1, total_doctors: 1 },
    doctor_breakdown: [ { name: "Dr X", specialty: "A", total_appointments: 1, completed: 1, cancelled: 0, no_show: 0, revenue: 100, average_rating: 5, total_reviews: 1, consultation_fee: 100 } ],
    daily_breakdown: [], 
    rating_breakdown: { "5": 1 }, 
    top_patients: [ { name: "A", email: "B", visits: 1 } ],
    appointment_details: [ { date: "1", time: "1", patient: "A", doctor: "B", specialty: "C", status: "Completed", fee: "100", reason: "-" } ]
};

try { 
    generateClinicReport(mockData); 
    console.log("SUCCESS"); 
} catch (e: any) { 
    console.error("FAILED", e.message, e.stack); 
}
