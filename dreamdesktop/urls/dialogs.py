
from django.conf.urls.defaults import *

urlpatterns = patterns('dreamdesktop.views',
  #settings dialog
  url(r'^settings/$', 'settings_front'),
  url(r'^settings/password/$', 'settings_change_pw'),
  url(r'^settings/userinfo/$', 'settings_insert_email_phonenumber'),
  url(r'^settings/join/$', 'settings_join'),
  url(r'^settings/part/$', 'settings_part'),
  url(r'^settings/upload/$', 'settings_upload_img'),

  #service dialog
  url(r'^services/$', 'services'),
  url(r'^services/gadget/(?P<action>(add|remove))/$', 'services_gadget_addrem'),
  url(r'^services/gadget/position/$', 'services_gadget_position'),

  # Email dialog
  url(r'^email/user/dialogs/(?P<dialog_id>\d+)/$', 'email_dialog_userinfo'),	
)

