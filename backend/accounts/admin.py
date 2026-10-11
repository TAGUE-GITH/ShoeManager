from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ['last_name', 'first_name']
    list_display = ['email', 'first_name', 'last_name', 'role', 'loyalty_points', 'is_active']
    list_filter = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    fieldsets = [
        (None, {'fields': ['email', 'password']}),
        (_('Informations'), {'fields': ['first_name', 'last_name', 'phone', 'role', 'loyalty_points']}),
        (_('Accès'), {'fields': ['is_active', 'is_staff', 'is_superuser']}),
    ]
    add_fieldsets = [
        (None, {'classes': ['wide'], 'fields': ['email', 'first_name', 'last_name', 'role', 'password1', 'password2']}),
    ]
