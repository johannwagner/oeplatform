# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = '0'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False
URL = '127.0.0.1'

# Database
# https://docs.djangoproject.com/en/1.8/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'django',
	'USER': 'databaseuser',
	'PASSWORD': 'databasepassword',
	'HOST': 'localhost'                      
	}
}
