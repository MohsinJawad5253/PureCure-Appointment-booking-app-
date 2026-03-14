from django.urls import path
from . import views

urlpatterns = [
    # Patient-facing (read only)
    path('<int:doctor_id>/slots/', views.AvailableSlotsView.as_view(), name='available-slots'),
    path('<int:doctor_id>/week/', views.WeekAvailabilityView.as_view(), name='week-availability'),
    path('slot/<uuid:slot_id>/', views.SlotDetailView.as_view(), name='slot-detail'),

    # Doctor-facing (write)
    path('schedule/', views.DoctorScheduleView.as_view(), name='doctor-schedule'),
    path('schedule/<uuid:id>/', views.DoctorScheduleDetailView.as_view(), name='doctor-schedule-detail'),
    path('blocked-dates/', views.BlockedDateView.as_view(), name='blocked-date-list'),
    path('blocked-dates/<uuid:id>/', views.BlockedDateDetailView.as_view(), name='blocked-date-detail'),
    path('generate/', views.GenerateSlotsView.as_view(), name='generate-slots'),
]
