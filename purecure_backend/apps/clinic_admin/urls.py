from django.urls import path
from .views import (
    ClinicAdminLoginView,
    ClinicDashboardView,
    ClinicPatientsView,
    ClinicPatientDetailView,
    ClinicAppointmentsView,
    ClinicDoctorsView,
    ClinicReviewsView,
    ClinicReportDataView,
)

urlpatterns = [
    path('login/', ClinicAdminLoginView.as_view(), name='clinic-admin-login'),
    path('dashboard/', ClinicDashboardView.as_view(), name='clinic-admin-dashboard'),
    path('patients/', ClinicPatientsView.as_view(), name='clinic-admin-patients'),
    path('patients/<uuid:patient_id>/', ClinicPatientDetailView.as_view(), name='clinic-admin-patient-detail'),
    path('appointments/', ClinicAppointmentsView.as_view(), name='clinic-admin-appointments'),
    path('doctors/', ClinicDoctorsView.as_view(), name='clinic-admin-doctors'),
    path('reviews/', ClinicReviewsView.as_view(), name='clinic-admin-reviews'),
    path('report-data/', ClinicReportDataView.as_view(), name='clinic-admin-report-data'),
    path('fix-dates/', FixDatesView.as_view(), name='clinic-admin-fix-dates'),
]
