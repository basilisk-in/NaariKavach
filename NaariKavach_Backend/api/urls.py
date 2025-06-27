from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'sos', views.SOSViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('create-sos/', views.CreateSOSView.as_view(), name='create-sos'),
    path('update-location/', views.LocationUpdateView.as_view(), name='update-location'),
    path('assign-officer/', views.AssignOfficerView.as_view(), name='assign-officer'),
    path('resolve-sos/<int:sos_id>/', views.ResolveSOSView.as_view(), name='resolve-sos'),
    path('get-all-sos/', views.GetAllSOSView.as_view(), name='get-all-sos'),
    path('upload-sos-images/', views.UploadSOSImagesView.as_view(), name='upload-sos-images'),
    path('get-sos-images/<int:sos_id>/', views.GetSOSImagesView.as_view(), name='get-sos-images'),
]
