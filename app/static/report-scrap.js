reportScrap = (captcha) => {
  $.post('/report', {
    to: window.admin.id,
    url: location.href,
    captcha,
    title: $('.scrap-title').text(),
    body: $('.scrap-body').text()
  })
}

$('.report-scrap').click(() => {
  // TODO: captcha
  reportScrap(captcha)
  return false
})
