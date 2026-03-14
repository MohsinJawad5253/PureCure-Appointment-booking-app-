from django.urls import path
from . import views

urlpatterns = [
    path('', views.DoctorListView.as_view(), name='doctor-list'),
    path('top-rated/', views.TopRatedDoctorsView.as_view(), name='doctor-top-rated'),
    path('specialties/', views.SpecialtyListView.as_view(), name='specialty-list'),
    path('specialty/<str:specialty>/', views.DoctorsBySpecialtyView.as_view(), name='doctors-by-specialty'),
    path('<int:id>/', views.DoctorDetailView.as_view(), name='doctor-detail'),
]
