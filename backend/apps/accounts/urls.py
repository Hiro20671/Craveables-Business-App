from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('user/', views.current_user, name='current_user'),
    path('change-password/', views.change_password, name='change_password'),
    path('users/', views.manage_users, name='manage_users'),
]

