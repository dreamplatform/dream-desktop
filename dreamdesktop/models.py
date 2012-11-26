
# -*- coding: UTF-8 -*-

from django.contrib.auth.models import User
from django.utils.translation import ugettext as _
from django.db import models
from dreamuserdb.models import Organisation

class QuerySetManager(models.Manager):
    use_for_related_fields = True

    def get_query_set(self):
        return self.model.QuerySet(self.model, using=self._db)

    def get_empty_query_set(self):
        return self.model.EmptyQuerySet(self.model)

    def __getattr__(self, attr, *args):
        if attr.startswith('_'):
            raise AttributeError
        return getattr(self.get_query_set(), attr, *args)


class Gadget(models.Model):
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=1000, blank=True)
    url = models.URLField(max_length=2048, verify_exists=False)
    owner = models.ForeignKey(User, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    service_url = models.URLField(max_length=2048, verify_exists=False, blank=True, null=True)
    icon = models.ImageField(upload_to='gadget_icon', null=True, blank=True, default=None)
    min_width = models.PositiveIntegerField(default=1, blank=True)
    min_height = models.PositiveIntegerField(default=1, blank=True)
    max_width = models.PositiveIntegerField(default=5, blank=True)
    max_height = models.PositiveIntegerField(default=5, blank=True)
    default_width = models.PositiveIntegerField(default=5, blank=True)
    default_height = models.PositiveIntegerField(default=5, blank=True)
    organisations = models.ManyToManyField(Organisation, blank=True)

    objects = QuerySetManager()

    class QuerySet(models.query.QuerySet):
        def for_user(self, user):
            return self.filter(organisations__in=user.organisations.all()).distinct()

    class EmptyQuerySet(QuerySet, models.query.EmptyQuerySet):
        pass

    class Meta:
        ordering = [u'-created']

    def add_to_user(self, user):
        ug, created = UserGadget.objects.get_or_create(user=user, gadget=self)
        ug.save()
        return ug

    def user_has_this(self, user):
        ug = self.user_gadgets.filter(user=user)
        if ug:
            return True
        return False

    def __unicode__(self):
        return "%s" % (self.name)


class UserGadget(models.Model):
    user = models.ForeignKey(User)
    gadget = models.ForeignKey(Gadget, related_name='user_gadgets')
    added = models.DateTimeField(auto_now_add=True)
    top = models.PositiveIntegerField(default=0, blank=True)
    left = models.PositiveIntegerField(default=0, blank=True)
    width = models.PositiveIntegerField(default=5, blank=True)
    height = models.PositiveIntegerField(default=5, blank=True)

    objects = QuerySetManager()

    class QuerySet(models.query.QuerySet):
        def for_user(self, user):
            return self.filter(user=user, gadget__organisations__in=user.organisations.all()).distinct()

    class EmptyQuerySet(QuerySet, models.query.EmptyQuerySet):
        pass

    class Meta:
        ordering = ["-added"]

    def __unicode__(self):
        return "%s: %s" % (self.gadget.name, self.user)


class Dialog(models.Model):
    name = models.CharField(_(u'Name'), max_length=255, unique=True)
    url = models.URLField(_(u'Address'), max_length=2048, verify_exists=False)

    def __unicode__(self):
        return "%s" % (self.name)
