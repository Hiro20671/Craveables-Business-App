import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from apps.accounts.models import UserProfile, UserRole
from apps.inventory.models import StockTransaction
from apps.sales.models import SaleOrder
from apps.expenses.models import Expense
from apps.production.models import ProductionOrder

def setup_owners():
    owners_data = [
        {
            'username': 'dyna',
            'first_name': 'Dyna',
            'last_name': 'Owner',
            'email': 'dyna@craveables.ph',
            'role': UserRole.ADMIN,
        },
        {
            'username': 'jeremy',
            'first_name': 'Jeremy',
            'last_name': 'Owner',
            'email': 'jeremy@craveables.ph',
            'role': UserRole.ADMIN,
        },
        {
            'username': 'anne',
            'first_name': 'Anne',
            'last_name': 'Owner',
            'email': 'anne@craveables.ph',
            'role': UserRole.ADMIN,
        },
    ]

    created_users = []
    default_password = 'craveables2026'

    for data in owners_data:
        user, created = User.objects.get_or_create(username=data['username'])
        user.first_name = data['first_name']
        user.last_name = data['last_name']
        user.email = data['email']
        user.is_superuser = True
        user.is_staff = True
        user.set_password(default_password)
        user.save()

        # UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = data['role']
        profile.save()

        created_users.append(user)
        action = "Created" if created else "Updated"
        print(f"[{action}] Owner Admin: {user.username} ({user.first_name}) - Equal Admin Power")

    dyna_user = User.objects.get(username='dyna')

    # Re-assign any existing records from old placeholder admin to Dyna
    for old_username in ['admin', 'staff']:
        try:
            old_u = User.objects.get(username=old_username)
            StockTransaction.objects.filter(created_by=old_u).update(created_by=dyna_user)
            SaleOrder.objects.filter(created_by=old_u).update(created_by=dyna_user)
            Expense.objects.filter(created_by=old_u).update(created_by=dyna_user)
            ProductionOrder.objects.filter(created_by=old_u).update(created_by=dyna_user)
            old_u.delete()
            print(f"[Deleted] Removed placeholder account: {old_username}")
        except User.DoesNotExist:
            pass

    print("\n--- Current Users in Database ---")
    for u in User.objects.all().select_related('profile'):
        print(f"Username: {u.username} | Name: {u.first_name} {u.last_name} | Role: {u.profile.role} | Superuser: {u.is_superuser} | Staff: {u.is_staff}")

if __name__ == '__main__':
    setup_owners()
