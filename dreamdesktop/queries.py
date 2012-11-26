
from django.core import serializers
from django import http
from django.forms.models import model_to_dict
from dreamsso import userdb
from dreamdesktop.settings import USE_MOCKUP_QUERIES

class MockupUserDbClient(object):
    def get_groups_for_user(self, user):
        return []

    def change_password(self, user, new_password=None, old_password=None):
        user.set_password(new_password)

    def get_group(self, gid):
        return {
          'organisation': {'id': 1},
          'official': False,
          }

    def leave_group(self, user, target_id):
        pass

    def join_group(self, user, target_id):
        pass


class UserDbClient(userdb.Client):
    def get_groups_for_user(self, user):
      all_groups = []
      for org in user.organisations:
          groups = self._get(('group', 'organisation', str(org['id'])))
          for group in groups:
              user_has_this_group = False
              for g in user.usergroups:
                  if g['id'] == group['id']:
                      user_has_this_group = True
                      break
              group['user_has_this'] = user_has_this_group
              if group['official'] and not user_has_this_group:
                  continue
              all_groups.append(group)
      return all_groups

    def change_password(self, user, new_password=None, old_password=None):
      self._put(('user', str(user.id)), {
        'password': new_password, 
        'password_check': old_password,
        })

    def get_group(self, gid):
        return self._get(('group', gid))

    def leave_group(self, user, target_id):
        for g in user.usergroups:
            if str(g['id']) == str(target_id):
                ug_list = user.usergroups[:]
                ug_list.remove(g)
                user.usergroups = ug_list
        user.save(commit_userdb=True)

    def join_group(self, user, target_id):
        users_groups = [str(g['id']) for g in user.usergroups]
        if not target_id in users_groups:
            group_info = self.get_group(target_id)
            if not group_info:
                raise http.Http404
            group_org = group_info['organisation']['id']
            users_orgs = [str(org['id']) for org in user.organisations]
            if not group_info['official'] and str(group_org) in users_orgs:
                ug_list = user.usergroups[:]
                ug_list.append({'id' : target_id})
                user.usergroups = ug_list
            else:
                raise http.Http404
        user.save(commit_userdb=True)


class LocalUserDbClient(object):
    def _qs_to_dict(self, qs):
      """Application code expects python datastructures campatible with dataformat
      in userdb api
      """
      l = serializers.serialize('python', qs)
      for d in l:
          fields = d.pop('fields')
          d.update(fields)
          d['id'] = d['pk']
      return l

    def get_groups_for_user(self, user):
        users_groups = self._qs_to_dict(user.user_groups.all())
        for g in users_groups:
            g['user_has_this'] = True
        unofficial_related_groups = self._qs_to_dict(dreamuserdb.models.Group.objects.\
                filter(organisation__in=user.organisations.all()))
        unique_unofficial_related_groups = []
        for g in unofficial_related_groups:
            is_duplicate = False
            for ug in users_groups:
                if g['id'] == ug['id']:
                    is_duplicate = True
                    break
            if is_duplicate:
                continue
            g['user_has_this'] = False
            unique_unofficial_related_groups.append(g)
        return users_groups + unique_unofficial_related_groups

    def change_password(self, user, new_password=None, old_password=None):
        user.set_password(new_password)
        user.save()

    def get_group(self, gid):
        try:
            group = dreamuserdb.models.Group.objects.get(pk=gid)
        except dreamuserdb.models.Group.DoesNotExist:
            return None
        group = model_to_dict(group)
        return group

    def leave_group(self, user, target_id):
        try:
            g = dreamuserdb.models.Group.objects.get(pk=target_id)
            user.user_groups.remove(g)
        except dreamuserdb.models.Group.DoesNotExist:
            raise http.Http404

    def join_group(self, user, target_id):
        users_groups = user.user_groups.values_list('id', flat=True)
        if not target_id in users_groups:
            try:
                group = dreamuserdb.models.Group.objects.get(pk=target_id)
            except dreamuserdb.models.Group.DoesNotExist:
                raise http.Http404
            user_org_ids = user.organisations.values_list('id', flat=True)
            if not group.official and group.organisation.id in user_org_ids:
                user.user_groups.add(group)
                user.save()
            else:
                raise http.Http404


# Use queries.userdb to access functions in this module
userdb = None
if USE_MOCKUP_QUERIES:
    userdb = MockupUserDbClient()
else:
  # if userdb app is installed use direct access to database$
  try:
    import dreamuserdb.models
    userdb = LocalUserDbClient()
  # userdb app not installed use http api
  except ImportError:
    userdb = UserDbClient()

