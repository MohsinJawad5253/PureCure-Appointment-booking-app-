import django_filters
from apps.users.models import DoctorProfile

class DoctorFilter(django_filters.FilterSet):
    specialty = django_filters.CharFilter(field_name='specialty', lookup_expr='iexact')
    min_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='gte')
    max_fee = django_filters.NumberFilter(field_name='consultation_fee', lookup_expr='lte')
    min_fee = django_filters.NumberFilter(field_name='consultation_fee', lookup_expr='gte')
    is_available = django_filters.BooleanFilter(field_name='is_available')
    clinic_id = django_filters.UUIDFilter(field_name='clinic__id')
    years_min = django_filters.NumberFilter(field_name='years_experience', lookup_expr='gte')
    language = django_filters.CharFilter(method='filter_by_language')

    def filter_by_language(self, queryset, name, value):
        return queryset.filter(languages__icontains=value)

    class Meta:
        model = DoctorProfile
        fields = ['specialty', 'min_rating', 'max_fee', 'min_fee', 'is_available', 'clinic_id', 'years_min', 'language']
