
from django.conf.urls.defaults import *

urlpatterns = patterns('dreamdesktop.views',
  url(r'^$', 'index', name='dreamdesktop_index'),
  url(r'^usergadgets$', 'user_gadgets', name='dreamdesktop_user_gadgets'),

  url(r'^dialog/logout/$', 'logout'),
)

