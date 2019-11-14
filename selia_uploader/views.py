import json
import pytz
from timezonefinder import TimezoneFinder

from django.shortcuts import get_object_or_404
from django.shortcuts import render
from django.views.generic import TemplateView

from irekua_rest_api.serializers.object_types.data_collections.items import SimpleListSerializer

from irekua_database.models import ItemType
from irekua_database.models import SamplingEventDevice
from irekua_database.models import Licence
from irekua_database.models import CollectionItemType

from irekua_permissions.items import items as item_permissions


def get_site_tz_info(site):
    timezone_finder = TimezoneFinder()
    timezone = timezone_finder.certain_timezone_at(lng=site.longitude, lat=site.latitude)
    return json.dumps({"site_timezone": timezone, "tz_list": pytz.all_timezones})


class SeliaUploaderView(TemplateView):
    template_name = 'selia_uploader/upload.html'
    no_permission_template = 'selia_templates/generic/no_permission.html'

    def get(self, *args, **kwargs):
        self.get_objects()

        if not self.has_view_permission():
            return self.no_permission_redirect()

        return super().get(*args, **kwargs)

    def no_permission_redirect(self):
        return render(self.request, self.no_permission_template)

    def get_item_types(self):
        collection = self.sampling_event_device.sampling_event.collection
        collection_type = collection.collection_type

        if collection_type.restrict_item_types:
            queryset = collection_type.item_types.all()
        else:
            queryset = ItemType.objects.all()

        collection_device = self.sampling_event_device.collection_device
        device_type = collection_device.physical_device.device.device_type
        mime_types = device_type.mime_types.all()

        queryset = queryset.filter(mime_types__in=mime_types)

        collection_item_types = CollectionItemType.objects.filter(
            collection_type=collection_type,
            item_type__in=queryset).distinct()

        serialized = SimpleListSerializer(
            collection_item_types,
            many=True,
            context={'request': self.request})
        return json.dumps(serialized.data)

    def get_objects(self):
        if not hasattr(self, 'sampling_event_device'):
            sampling_event_device_pk = self.request.GET.get("sampling_event_device", None)
            self.sampling_event_device = get_object_or_404(
                SamplingEventDevice, pk=sampling_event_device_pk)

        if not hasattr(self, 'licence'):
            licence_pk = self.request.GET.get("licence", None)
            self.licence = get_object_or_404(Licence, pk=licence_pk)

    def has_view_permission(self):
        user = self.request.user
        return item_permissions.create(
            user, sampling_event_device=self.sampling_event_device)

    def get_context_data(self, *args, **kwargs):
        context = super().get_context_data(*args, **kwargs)

        sampling_event = self.sampling_event_device.sampling_event
        site = sampling_event.collection_site.site

        context["collection"] = sampling_event.collection
        context["item_types"] = self.get_item_types()
        context["licence"] = self.licence

        context["sampling_event_device"] = self.sampling_event_device
        context["sampling_event"] = sampling_event

        context["started_on"] = sampling_event.started_on.strftime('%Y-%m-%d %H:%M:%S')
        context["ended_on"] = sampling_event.ended_on.strftime('%Y-%m-%d %H:%M:%S')
        context["tz_info"] = get_site_tz_info(site)

        return context
