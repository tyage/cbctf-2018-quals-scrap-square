import urllib.request
import urllib.parse

ENDPOINT = 'http://localhost:3000/'

def post(path, data):
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    req = urllib.request.Request(ENDPOINT + path, data.encode(), headers)
    with urllib.request.urlopen(req) as res:
        return res.read()

register_data = {
    'name': 'hoge123',
    'password': 'hoge123'
}
res = post('register', urllib.parse.urlencode(register_data))
