$(() => {
  urls = location.href.split('/')
  user = urls[urls.length - 2]
  name = urls[urls.length - 1]
  $.get(`/static/raw/${user}/${name}`)
    .then(c => $('.scrap-body').text(c))
})
