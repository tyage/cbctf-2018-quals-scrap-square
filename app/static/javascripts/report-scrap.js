window.reportScrap = (captcha) => {
  return $.post('/report', {
    to: window.admin.id,
    url: location.href,
    'g-recaptcha-response': captcha,
    title: $('.scrap-title').text(),
    body: $('.scrap-body').text()
  })
}

$('.report-scrap-button').click(() => {
  const captcha = $('#g-recaptcha-response').val()
  reportScrap(captcha).then(() => {
    alert('reported! admin will view your report.')
  })
})
