from rest_framework.permissions import BasePermission

class IsPatient(BasePermission):
    message = "Access restricted to patients only."
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'patient'

class IsDoctor(BasePermission):
    message = "Access restricted to doctors only."
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'doctor'

class IsOwner(BasePermission):
    message = "You do not have permission to access this resource."
    def has_object_permission(self, request, view, obj):
        return obj == request.user or obj.user == request.user
