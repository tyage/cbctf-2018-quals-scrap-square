const { spawn } = require('child_process')
const puppeteer = require('puppeteer')
const sqlite3 = require('sqlite3')
const config = require('../config.js')

const adminUid = 'admin'
const db = new sqlite3.Database('../app/scrap.db')

const sleep = (millsec) => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve()
  }, millsec)
})

const visitUrl = async (report) => {
  console.log(`checking report ${report.id}`)
  console.log(report)
  const browser = await puppeteer.launch({
    args: [
      '--media-cache-size=1',
      '--disk-cache-size=1',
      '--headless',
      '--disable-gpu',
      '--remote-debugging-port=0'
    ]
  })
  const page = await browser.newPage()
  await page.goto(config.serverUrl)
  await page.evaluate(async (adminLogin) => {
    await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: (new URLSearchParams(adminLogin)).toString(),
      credentials: 'include'
    })
  }, config.adminLogin)
  await page.goto(report.url)
  await sleep(3000)
  console.log(`checking report ${report.id} is done`)
  await browser.close()
}

const checkReport = async (report) => {
  return new Promise((resolve, reject) => {
    // delete report when check started
    db.run('delete from reports where id = ?', report.id, async () => {
      await visitUrl(report)
      resolve()
    })
  })
}

const checkAllReports = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.all(
        'select id, url, title, body from reports where uid = ?',
        adminUid,
        async (err, reports) => {
          for (let report of reports) {
            await checkReport(report)
          }
          resolve()
        }
      )
    })
  })
}

(async () => {
  while (true) {
    await checkAllReports()
    await sleep(3000)
  }
})()
