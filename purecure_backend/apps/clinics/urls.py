from django.urls import path
from . import views

urlpatterns = [
    path('', views.ClinicListView.as_view(), name='clinic-list'),
    path('top-rated/', views.TopRatedClinicsView.as_view(), name='clinic-top-rated'),
    path('<uuid:id>/', views.ClinicDetailView.as_view(), name='clinic-detail'),
]
