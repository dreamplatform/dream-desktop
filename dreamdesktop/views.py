
#encoding=utf-8

import logging
import sys
from django.http import HttpResponse, HttpResponseRedirect
from django.template import RequestContext
from django.shortcuts import render
from django.template.loader import render_to_string
from django.contrib.auth.decorators import login_required
from django.core.validators import email_re, URLValidator
from django.core.exceptions import ValidationError
from django.utils import simplejson as json
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
import requests
from dreamdesktop.models import Gadget, UserGadget

from dreamdesktop.queries import userdb as USERDB

LOG = logging.getLogger(__name__)

def _get_users_organisations(user):
    try:
        iter(user.organisations)
        return user.organisation
    except TypeError:
        return user.organisations.all()

def _get_users_groups(user):
    try:
        iter(user.usergroups)
        return user.usergroups
    except TypeError:
        return user.user_groups.all()

def _get_users_roles(user):
    try:
        iter(user.roles)
        return user.organisation
    except TypeError:
        return user.roles.all()

def _msgapi_get(resource_str, params):
    url = u'%s/%s/' % (settings.DREAMDESKTOP_MSG_API, u'/'.join(resource_str))
    try:
        r = requests.get(url, params=params, auth=(settings.DREAMDESKTOP_MSG_USER, settings.DREAMDESKTOP_MSG_PASSWORD))
        r.raise_for_status()
    except Exception as e:
        LOG.error(u'Could not get data from messaging api', exc_info=sys.exc_info(), extra={u'exception type' : type(e), u'exception': e})
        return []
    return json.loads(r.content)[u'objects']

@login_required
def logout(request):
    #if u'logout' in request.GET:
    return HttpResponseRedirect(u'/saml/logout')
    return render(request, u'dreamdesktop/dialog-logout.html')

@login_required
def index(request):
    gadget_list = Gadget.objects.for_user(request.user).order_by('name')
    all_gadgets = []
    for gadget in gadget_list:
        item = [gadget, gadget.user_has_this(request.user)]
        all_gadgets.append(item)
    return render(request, 'dreamdesktop/index.html', {
        'gadgets': UserGadget.objects.for_user(request.user),
        'all_gadgets': all_gadgets,
        })

@login_required
def settings_front(request):
    all_groups = USERDB.get_groups_for_user(request.user)
    context = {
        'groups_in_users_orgs': all_groups,
        'users_organisations': _get_users_organisations(request.user),
        'users_roles': _get_users_roles(request.user),
    }
    return render(request, 'dreamdesktop/settings_dialog_frontpage.html', context)

@login_required
def settings_change_pw(request):
    if 'old_pw' in request.POST and 'new_first' in request.POST and 'new_rep' in request.POST and request.POST['new_first'] == request.POST['new_rep']:
        USERDB.change_password(request.user,
                               new_password=request.POST['new_rep'],
                               old_password=request.POST['old_pw'])
        return HttpResponse()
    else:
        return HttpResponse(status=401)

@login_required
def settings_insert_email_phonenumber(request):
    new_email = None
    new_phone = None
    if 'user_email' in request.POST and request.POST['user_email'] != 'null':
        new_email = request.POST['user_email']
    if 'user_phone' in request.POST and request.POST['user_phone'] != 'null':
        new_phone = request.POST['user_phone']
    if new_email is not None:
        if email_re.match(new_email):
            request.user.email = new_email
            request.user.save(commit_userdb=True)
        else:
            return HttpResponse(status=400)
    if new_phone is not None:
        if new_phone.isdigit():
            request.user.phone_number = new_phone
            request.user.save(commit_userdb=True)
        else:
            return HttpResponse(status=400)
    return HttpResponse(status=200)

@login_required
def settings_join(request):
    target_type = request.POST.get('target_type',None)
    target_id = request.POST.get('target_id',None)
    if target_type is not None and target_id is not None:
        user = request.user
        if target_type == 'group':
            USERDB.join_group(user, target_id)
            return HttpResponse(status=200)
    else:
        return HttpResponse(status=400)

@login_required
def settings_part(request):
    target_type = request.POST.get('target_type',None)
    target_id = request.POST.get('target_id',None)
    if target_type is not None and target_id is not None:
        user = request.user
        if target_type == 'group':
            USERDB.leave_group(user, target_id)
            return HttpResponse(status=200)
    else:
        return HttpResponse(status=400)

@login_required
def settings_upload_img(request):
    if 'img_url' in request.POST:
        validate = URLValidator(verify_exists=True)
        try:
            validate(request.POST['img_url'])
            request.user.picture_url = request.POST['img_url']
            request.user.save(commit_userdb=True)
            return HttpResponse(status=200)
        except ValidationError:
            return HttpResponse(status=400)
    else:
        return HttpResponse(status=400)

@login_required
def services(request):
    if request.method == u'GET':
        gadget_list = Gadget.objects.for_user(request.user)
        gadgets = []
        for gadget in gadget_list:
            item = [gadget, gadget.user_has_this(request.user)]
            gadgets.append(item)

        return render(request, 'dreamdesktop/dialog-services.html', {
            'user_gadgets': UserGadget.objects.for_user(request.user),
            'gadgets': gadgets,
            })

@login_required
def services_gadget_position(request):
  if request.method == 'POST' and 'id' in request.POST:
    ug = UserGadget.objects.for_user(request.user).get(id=request.POST['id'])
    save = False
    if 'top' in request.POST and 'left' in request.POST:
      top = int(request.POST['top'])
      if top < 0: top = 0
      left = int(request.POST['left'])
      if left < 0: left = 0
      ug.top = top
      ug.left = left
      save = True
    if 'width' in request.POST and 'height' in request.POST:
      gadget = ug.gadget
      width = int(request.POST['width'])
      if width < gadget.min_width: width = gadget.min_width
      elif width > ug.gadget.max_width: width = gadget.max_width
      height = int(request.POST['height'])
      if height < gadget.min_height: height = gadget.min_height
      elif height > gadget.max_height: height = gadget.max_height
      ug.width = width
      ug.height = height
      save = True
    if save:
      ug.save()
      return HttpResponse()
  return HttpResponse(status=400)

@login_required
def services_gadget_addrem(request, action):
    """
    Handles adding and removing gadget to user. When adding, returns html snippet
    which is inserted to dom by js. When deleting returns id of removed usergadget
    """
    if request.method == u'POST':
        if action and u'gadgetid' in request.POST:
            gadget_id = request.POST[u'gadgetid']
            if action == u'add':
                try:
                    gadget = Gadget.objects.for_user(request.user).get(pk=gadget_id)
                except ObjectDoesNotExist:
                    return HttpResponse(400)
                ug = gadget.add_to_user(request.user)
                ret = request.GET.get('ret', 'snippet')
                if ret == 'id':
                  return HttpResponse(ug.id)
                ugsnip = render(request, u'dreamdesktop/dialog-services-usergadget.html', {u'usergadget' : ug})
                return HttpResponse(ugsnip, status=200)
            else:
                qs = UserGadget.objects.filter(gadget=gadget_id, user=request.user)
                if qs.count() == 0:
                    return HttpResponse(status=400)
                usergadget = qs[0]
                ugid = usergadget.id
                usergadget.delete()
                return HttpResponse(ugid, status=200)
    return HttpResponse(status=400)

@login_required
def email_dialog_userinfo(request, dialog_id):
    dialog_id = int(dialog_id)
    template = None
    if dialog_id == 1:
        template = 'dreamdesktop/email-dialog-bg.html'
    if dialog_id == 2:
        template = 'dreamdesktop/email-dialog-bg.html'
    if dialog_id == 3:
        template = 'dreamdesktop/email-dialog-bg.html'
    return render(request, template, {})


@login_required
def user_gadgets(request):
    context = {
        'gadgets' : UserGadget.objects.for_user(request.user),
    }
    return render(request, 'dreamdesktop/gadgets.html', context)


