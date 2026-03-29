from rest_framework.permissions import BasePermission


class IsClinicAdmin(BasePermission):
    message = 'Access restricted to clinic administrators.'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'clinic_admin_profile') \
            and request.user.clinic_admin_profile.is_active
