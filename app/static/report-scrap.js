$(() => {
  $('.report-scrap').click(() => {
    $.post('/report', {
      to: config.admin,
      url: location.href,
      title: $('.scrap-title').text(),
      body: $('.scrap-body').text()
    })
    return false
  })
})
