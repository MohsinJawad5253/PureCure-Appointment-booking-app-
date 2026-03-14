from django.urls import path
from . import views

urlpatterns = [
    # Agenda
    path('agenda/', views.DailyAgendaView.as_view()),
    path('agenda/week/', views.WeekAgendaView.as_view()),
    path('agenda/upcoming-today/', views.UpcomingTodayView.as_view()),

    # Patients
    path('patients/', views.PatientListView.as_view()),
    path('patients/search/', views.SearchPatientsView.as_view()),
    path('patients/<uuid:patient_id>/', views.PatientDetailView.as_view()),

    # Stats & Earnings
    path('stats/', views.DashboardStatsView.as_view()),
    path('earnings/', views.EarningsSummaryView.as_view()),

    # Profile
    path('profile/', views.DoctorProfileView.as_view()),
    path('profile/availability/', views.DoctorAvailabilityToggleView.as_view()),

    # Notifications
    path('notifications/', views.NotificationsView.as_view()),
]
