const { spawn } = require('child_process')
const sqlite3 = require('sqlite3')

const adminId = 1
const db = new sqlite3.Database('../app/scrap.db')
const chromePath = ''

const checkReport = async (report) => {
  return new Promise((resolve, reject) => {
    const launchChrome = () => {
      console.log(`checking report ${report.id}`)
      console.log(report)
      const chrome = spawn(chromePath, [
        report.url,
        '--media-cache-size=1',
        '--disk-cache-size=1',
        '--headless',
        '--disable-gpu',
        '--remote-debugging-port=0'
      ])
      setTimeout(() => {
        console.log(`checking report ${report.id} is done`)
        chrome.kill()
        resolve()
      }, 3000)
    }

    // delete report when check started
    db.run('delete from reports where id = ?', reports.id, () => {
      launchChrome()
    })
  })
}

const checkAllReports = async () => {
  db.serialize(() => {
    db.all(
      'select id, url, title, body from reports where user_id = ?',
      adminId,
      (err, reports) => {
        for (let report of reports) {
          await checkReport(report)
        }
      }
    )
  })
}
