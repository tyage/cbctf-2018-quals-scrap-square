const { spawn } = require('child_process')

const chromePath = ''

const chrome = spawn(chromePath, [
  url,
  '--media-cache-size=1',
  '--disk-cache-size=1',
  '--headless',
  '--disable-gpu',
  '--remote-debugging-port=0'
])
setTimeout(() => {
  chrome.kill()
}, 3000)
