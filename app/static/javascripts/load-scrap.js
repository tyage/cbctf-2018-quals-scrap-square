let urls = location.href.split('/')
let user = urls[urls.length - 2]
let name = urls[urls.length - 1]
$.get(`/static/raw/${user}/${name}`)
  .then(c => {
    let scrapBody = $('<pre class="scrap-body">')
    scrapBody.text(c)
    $('.scrap-wrapper').append(scrapBody)
  })
