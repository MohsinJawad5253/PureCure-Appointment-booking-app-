import uuid
from django.db import models

class Clinic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    address = models.TextField()
    city = models.CharField(max_length=100, default='Mumbai')
    photo = models.ImageField(upload_to='clinics/', blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    review_count = models.PositiveIntegerField(default=0)
    distance_km = models.DecimalField(max_digits=5, decimal_places=1, default=0.0)
    tags = models.JSONField(default=list)
    # tags examples: ["SPECIALIZED", "24/7", "FAMILY CARE", "EMERGENCY"]
    opening_time = models.TimeField(default='09:00')
    closing_time = models.TimeField(default='21:00')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'clinics'
        ordering = ['-rating', 'name']

    def __str__(self):
        return f"{self.name} — {self.city}"
