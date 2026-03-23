from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.db import transaction
from django.conf import settings
from .models import User, DoctorProfile
from .serializers import (
    PatientRegisterSerializer, DoctorRegisterSerializer, LoginSerializer,
    UserProfileSerializer, UpdateProfileSerializer, ChangePasswordSerializer
)

def api_response(success, message, data=None, errors=None, status_code=200):
    response_data = {
        "success": success,
        "message": message
    }
    if data is not None:
        response_data["data"] = data
    if errors is not None:
        response_data["errors"] = errors
    return Response(response_data, status=status_code)

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class PatientRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PatientRegisterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                tokens = get_tokens_for_user(user)
                user_data = UserProfileSerializer(user).data
                return api_response(
                    success=True,
                    message="Patient registered successfully",
                    data={"user": user_data, "tokens": tokens},
                    status_code=status.HTTP_201_CREATED
                )
            except Exception as e:
                return api_response(
                    success=False,
                    message="An unexpected error occurred",
                    errors={"detail": str(e)},
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return api_response(
            success=False,
            message="Validation failed",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

class DoctorRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = DoctorRegisterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                tokens = get_tokens_for_user(user)
                user_data = UserProfileSerializer(user).data
                return api_response(
                    success=True,
                    message="Doctor registered successfully",
                    data={"user": user_data, "tokens": tokens},
                    status_code=status.HTTP_201_CREATED
                )
            except Exception as e:
                return api_response(
                    success=False,
                    message="An unexpected error occurred",
                    errors={"detail": str(e)},
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return api_response(
            success=False,
            message="Validation failed",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = get_tokens_for_user(user)
            user_data = UserProfileSerializer(user).data
            return api_response(
                success=True,
                message="Login successful",
                data={"user": user_data, "tokens": tokens}
            )
        
        # Determine status code based on errors
        status_code = status.HTTP_400_BAD_REQUEST
        if 'errors' in serializer.errors: # Non-field errors
              errors = serializer.errors['errors']
              if "deactivated" in str(errors):
                  status_code = status.HTTP_403_FORBIDDEN
              elif "Invalid" in str(errors):
                  status_code = status.HTTP_401_UNAUTHORIZED
        
        return api_response(
            success=False,
            message="Login failed",
            errors=serializer.errors,
            status_code=status_code
        )

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return api_response(
                    success=False,
                    message="Refresh token is required",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return api_response(success=True, message="Logout successful")
        except Exception as e:
            return api_response(
                success=False,
                message="Invalid or expired token",
                errors={"detail": str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            return api_response(
                success=True,
                message="Token refreshed successfully",
                data=response.data
            )
        except Exception as e:
            return api_response(
                success=False,
                message="Token refresh failed",
                errors={"detail": "Invalid or expired refresh token"},
                status_code=status.HTTP_401_UNAUTHORIZED
            )

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return api_response(
            success=True,
            message="User profile retrieved",
            data=serializer.data
        )

class UpdateProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user, 
            data=request.data, 
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return api_response(
                success=True,
                message="Profile updated successfully",
                data=serializer.data
            )
        return api_response(
            success=False,
            message="Update failed",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            # Blacklist all existing tokens for this user
            # Usually simplejwt blacklists only the provided token, 
            # but for security we can rotate or user can log in again.
            # In this case we provide new tokens as requested.
            tokens = get_tokens_for_user(user)
            
            return api_response(
                success=True,
                message="Password changed successfully",
                data={"tokens": tokens}
            )
        return api_response(
            success=False,
            message="Password change failed",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

class SavePushTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        push_token = request.data.get('push_token', '').strip()

        if not push_token:
            return api_response(
                success=False,
                message="push_token is required",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # Validate it looks like an Expo push token
        if not push_token.startswith('ExponentPushToken['):
            return api_response(
                success=False,
                message="Invalid push token format",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        request.user.push_token = push_token
        request.user.save(update_fields=['push_token'])

        return api_response(
            success=True,
            message="Push token saved successfully"
        )
