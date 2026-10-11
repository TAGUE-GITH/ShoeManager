from rest_framework.permissions import BasePermission

from accounts.models import Role


class IsManager(BasePermission):
    """Gerant uniquement : produits, categories, stock, equipe."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.GERANT)


class IsStaffMember(BasePermission):
    """Gerant ou vendeur : commandes, reservations, caisse."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff_member)
