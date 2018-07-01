$(() => {
  $('.edit-scrap').click(() => {
    body = $('.scrap-body').hide().text()
    $('.scrap-editor').show()
    $('.scrap-editor textarea').val(body)
    return false
  })
})
