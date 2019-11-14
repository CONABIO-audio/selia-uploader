from django.conf.urls import url
from django.conf.urls import include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    url(
        r'^upload/',
        include(('selia_uploader.urls', 'selia_uploader'))),
    url(
        r'^thumbnails/',
        include(('selia_thumbnails.urls', 'selia_thumbnails'))),
    url(r'^api/', include('irekua_rest_api.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
