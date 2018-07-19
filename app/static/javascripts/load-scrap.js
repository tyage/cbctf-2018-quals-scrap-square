const urls = location.href.split('/')
const user = urls[urls.length - 2]
const title = urls[urls.length - 1]

// show title
const scrapTitle = $('<h1 class="scrap-title">')
scrapTitle.text(title)
$('.scrap-header').append(scrapTitle)

// show body
$.get(`/static/raw/${user}/${title}`)
  .then(c => {
    const scrapBody = $('<pre class="scrap-body">')
    scrapBody.text(c)
    $('.scrap-wrapper').append(scrapBody)
  })
