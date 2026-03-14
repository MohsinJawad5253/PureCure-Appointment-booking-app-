from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, DoctorProfile
import re

class PatientRegisterSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'password', 'confirm_password', 'date_of_birth', 'gender']
        extra_kwargs = {
            'password': {'write_only': True},
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
        }

    def validate_email(self, value):
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not re.search(r'[@$!%*?&]', value):
            raise serializers.ValidationError("Password must contain at least one special character (@$!%*?&).")
        return value

    def validate_phone(self, value):
        if value and not re.match(r'^\d{10,15}$', value):
            raise serializers.ValidationError("Phone number must be between 10 and 15 digits.")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        email = validated_data['email']
        
        user = User.objects.create(
            **validated_data,
            username=email,
            role='patient'
        )
        user.set_password(password)
        user.save()
        return user

class DoctorRegisterSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)
    specialty = serializers.ChoiceField(choices=DoctorProfile.SPECIALTY_CHOICES)
    clinic_name = serializers.CharField(max_length=200)
    years_experience = serializers.IntegerField(min_value=0, max_value=50)
    license_number = serializers.CharField(max_length=50)
    bio = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'password', 'confirm_password', 
                  'specialty', 'clinic_name', 'years_experience', 'license_number', 'bio']
        extra_kwargs = {
            'password': {'write_only': True},
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
        }

    def validate_email(self, value):
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not re.search(r'[@$!%*?&]', value):
            raise serializers.ValidationError("Password must contain at least one special character (@$!%*?&).")
        return value

    def validate_license_number(self, value):
        if not re.match(r'^[a-zA-Z0-9-]+$', value):
            raise serializers.ValidationError("License number must be alphanumeric.")
        if DoctorProfile.objects.filter(license_number=value).exists():
            raise serializers.ValidationError("This license number is already registered.")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        profile_data = {
            'specialty': validated_data.pop('specialty'),
            'clinic_name': validated_data.pop('clinic_name'),
            'years_experience': validated_data.pop('years_experience'),
            'license_number': validated_data.pop('license_number'),
            'bio': validated_data.pop('bio', ''),
        }
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        email = validated_data['email']

        user = User.objects.create(
            **validated_data,
            username=email,
            role='doctor'
        )
        user.set_password(password)
        user.save()

        DoctorProfile.objects.create(user=user, **profile_data)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)

    def validate(self, data):
        email = data.get('email').lower()
        password = data.get('password')
        role = data.get('role')

        user = User.objects.filter(email=email).first()

        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password.")

        if user.role != role:
            raise serializers.ValidationError(f"This account is registered as a {user.role}. Please select the correct role.")

        if not user.is_active:
            raise serializers.ValidationError("Your account has been deactivated. Contact support.")

        data['user'] = user
        return data

class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'phone', 'role', 
                  'profile_photo', 'gender', 'date_of_birth', 'is_profile_complete', 'created_at']
        read_only_fields = fields

class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'gender', 'date_of_birth', 'profile_photo']

    def validate_phone(self, value):
        if value and not re.match(r'^\d{10,15}$', value):
            raise serializers.ValidationError("Phone number must be between 10 and 15 digits.")
        return value

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Check if profile is complete
        required_fields = ['first_name', 'last_name', 'phone', 'gender', 'date_of_birth']
        is_complete = all([getattr(instance, field) for field in required_fields])
        instance.is_profile_complete = is_complete
        
        instance.save()
        return instance

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not re.search(r'[@$!%*?&]', value):
            raise serializers.ValidationError("Password must contain at least one special character (@$!%*?&).")
        
        user = self.context['request'].user
        if user.check_password(value):
            raise serializers.ValidationError("New password cannot be the same as the old password.")
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({"confirm_new_password": "Passwords do not match."})
        return data
