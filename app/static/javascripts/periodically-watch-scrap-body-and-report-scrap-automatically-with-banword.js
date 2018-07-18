let timer = setInterval(() => {
  if ($('.scrap-body').length === 0) {
    return;
  }

  clearInterval(timer)
  if ($('.scrap-body').text().includes(window.banword || '')) {
    reportScrap()
  }
}, 300)
