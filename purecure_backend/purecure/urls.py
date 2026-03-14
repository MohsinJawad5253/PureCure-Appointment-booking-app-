from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/doctors/', include('apps.doctors.urls')),
    path('api/clinics/', include('apps.clinics.urls')),
    path('api/timeslots/', include('apps.timeslots.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
