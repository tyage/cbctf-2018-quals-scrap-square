let urls = location.href.split('/')
let user = urls[urls.length - 2]
let name = urls[urls.length - 1]
$.get(`/static/raw/${user}/${name}`)
  .then(c => $('.scrap-body').text(c))
