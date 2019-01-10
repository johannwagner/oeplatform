"""
This module handles all relevant features that belong to specific sessions.
"""

from .error import APIError
from .actions import _get_engine, get_or_403

from random import randrange
import sys
import time
from oeplatform.securitysettings import TIME_OUT

_SESSION_CONTEXTS = {}


class SessionContext:

    def __init__(self, connection_id=None):
        engine = _get_engine()
        self.connection = engine.connect().connection
        if connection_id is None:
            connection_id = _add_entry(self, _SESSION_CONTEXTS)
        elif connection_id not in _SESSION_CONTEXTS:
            _SESSION_CONTEXTS[connection_id] = self
        else:
            raise Exception('Tried to open existing')
        self.connection._id = connection_id
        self.session_context = self
        current_time = time.time()
        self.last_activity = current_time
        print('Open connection:', self.connection._id)
        self.cursors = {}
        for sid in dict(_SESSION_CONTEXTS):
            sess = _SESSION_CONTEXTS[sid]
            if current_time - sess.last_activity > TIME_OUT and not sess.cursors:
                sess.close()

    def get_cursor(self, cursor_id):
        try:
            return self.cursors[cursor_id]
        except KeyError:
            raise APIError('Cursor not found %s'%cursor_id)

    def open_cursor(self):
            cursor = self.connection.cursor()
            cursor_id = _add_entry(cursor, self.cursors)
            return cursor_id

    def close_cursor(self, cursor_id):
        cursor = self.get_cursor(cursor_id)
        cursor.close()
        del self.cursors[cursor_id]

    def close(self):
        self.connection.close()
        del _SESSION_CONTEXTS[self.connection._id]


def load_cursor_from_context(context):
    session = load_session_from_context(context)
    cursor_id = get_or_403(context, 'cursor_id')
    return session.get_cursor(cursor_id)


def load_session_from_context(context):
    connection_id = get_or_403(context, 'connection_id')
    try:
        sess = _SESSION_CONTEXTS[connection_id]
        sess.last_activity = time.time()
        return sess
    except KeyError:
        return SessionContext(connection_id=connection_id)


def _add_entry(value, dictionary):
    key = randrange(0, sys.maxsize)
    while key in dictionary:
        key = randrange(0, sys.maxsize)
    dictionary[key] = value
    return key