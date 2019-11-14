from django.urls import path
from selia_uploader.views import SeliaUploaderView


urlpatterns = [
    path('', SeliaUploaderView.as_view(), name='upload_app'),
]
