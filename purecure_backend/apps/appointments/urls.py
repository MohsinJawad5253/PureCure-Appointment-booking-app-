from django.urls import path
from . import views

urlpatterns = [
    # Patient endpoints
    path('', views.BookAppointmentView.as_view()),
    path('my/', views.PatientAppointmentListView.as_view()),
    path('my/<uuid:id>/', views.PatientAppointmentDetailView.as_view()),
    path('my/<uuid:id>/cancel/', views.CancelAppointmentView.as_view()),
    path('my/<uuid:id>/reschedule/', views.RescheduleAppointmentView.as_view()),
    path('my/<uuid:id>/review/', views.SubmitReviewView.as_view()),

    # Doctor endpoints
    path('doctor/', views.DoctorAppointmentListView.as_view()),
    path('doctor/stats/', views.AppointmentStatsView.as_view()),
    path('doctor/<uuid:id>/', views.DoctorAppointmentDetailView.as_view()),
    path('doctor/<uuid:id>/complete/', views.CompleteAppointmentView.as_view()),
    path('doctor/<uuid:id>/no-show/', views.NoShowView.as_view()),
    path('doctor/<uuid:id>/cancel/', views.DoctorCancelView.as_view()),
    path('doctor/<uuid:id>/notes/', views.UpdateNotesView.as_view()),
]
