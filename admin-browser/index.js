const { spawn } = require('child_process')
const puppeteer = require('puppeteer')
const sqlite = require('sqlite')
const config = require('../config.js')

const adminUid = 'admin'

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

const checkReport = async (db, report) => {
  // delete report when check started
  await db.run('delete from reports where id = ?', report.id)
  await visitUrl(report)
}

const checkAllReports = async (db) => {
  const reports = await db.all(
    'select id, url, title, body from reports where uid = ?',
    adminUid
  )
  for (let report of reports) {
    await checkReport(db, report)
  }
}

(async () => {
  const db = await sqlite.open('../app/scrap.db')
  while (true) {
    await checkAllReports(db)
    await sleep(3000)
  }
})()
