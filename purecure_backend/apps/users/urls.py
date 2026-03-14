from django.urls import path
from .views import (
    PatientRegisterView, DoctorRegisterView, LoginView, LogoutView,
    CustomTokenRefreshView, MeView, UpdateProfileView, ChangePasswordView
)

urlpatterns = [
    path('patient/register/', PatientRegisterView.as_view(), name='patient-register'),
    path('doctor/register/', DoctorRegisterView.as_view(), name='doctor-register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token-refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('me/update/', UpdateProfileView.as_view(), name='me-update'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]
