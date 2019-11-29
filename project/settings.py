from irekua_dev_settings.settings import *
from irekua_database.settings import *
from irekua_rest_api.settings import *
from selia_templates.settings import *
from selia_thumbnails.settings import *
from selia_uploader.settings import *


INSTALLED_APPS = (
    SELIA_UPLOADER_APPS +
    SELIA_THUMBNAILS_APPS +
    SELIA_TEMPLATES_APPS +
    IREKUA_REST_API_APPS +
    IREKUA_DATABASE_APPS +
    IREKUA_BASE_APPS
)
