const express = require('express')
const session = require('express-session')
const path = require('path')
const bodyParser = require('body-parser')
const sqlite = require('sqlite')
const fs = require('fs')
const Recaptcha = require('express-recaptcha').Recaptcha;
const crypto = require('crypto')
const config = require('../../config.js')

const hashPassword = (password) => {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  return hash.digest('hex')
}

const initializeDB = async (db) => {
  const result = await db.get('select count(*) from sqlite_master')
  if (result['count(*)'] !== 0) {
    return
  }

  await db.run('create table users (id integer primary key, uid text unique, name text unique, password text)')
  await db.run('create table reports (id integer primary key, uid string, url text, title text, body text)')
  await db.run(
    'insert into users (uid, name, password) values (?, ?, ?)',
    'admin', config.adminLogin.name, hashPassword(config.adminLogin.password)
  )
}

const generateUid = async (db) => {
  const isUidUnique = async (uid) => {
    const result = await db.get('select * from users where uid = ?', uid)
    return result === undefined
  }

  let newUid
  while (true) {
    newUid = Math.random().toString(36).substring(2, 10)
    const isUnique = await isUidUnique(newUid)
    if (isUnique) {
      break
    }
  }
  return newUid
}

const isTitleValid = (title) => {
  const errors = []
  if (title.length > 30) {
    errors.push('Title length should be less than 30')
  }
  if (/[^0-9a-zA-Z '.]/.test(title)) {
    errors.push('You cannot use unsafe character')
  }
  return {
    success: errors.length === 0,
    errors
  }
}
const isBodyValid = (body) => {
  const errors = []
  if (/[^0-9a-zA-Z '.\n\r/-]/.test(body)) {
    errors.push('You cannot use unsafe character')
  }
  return {
    success: errors.length === 0,
    errors
  }
}

const startApp = async () => {
  const recaptcha = new Recaptcha(config.recaptcha.siteKey, config.recaptcha.secretKey);

  const db = await sqlite.open('./scrap.db')
  initializeDB(db)

  const app = express()

  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(session({
    secret: config.express.secret,
    resave: false,
    saveUninitialized: false
  }))

  // set CSP to prevent XSS
  app.use((req, res, next) => {
    res.set('Content-Security-Policy', `
      default-src 'none';
      script-src 'self' https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/js/bootstrap.min.js https://code.jquery.com/jquery-3.3.1.min.js http://www.google.com/recaptcha/api.js https://www.gstatic.com/recaptcha/;
      style-src 'self' https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css;
      img-src 'self';
      frame-src https://www.google.com/recaptcha/;
      connect-src 'self'
    `.replace(/\n/g, ''))
    next()
  })

  // serve static files
  const staticBaseUri = '/static'
  const staticDir = path.join(__dirname, '..', 'static')
  const rawStaticDir = path.join(staticDir, 'raw')
  app.use(staticBaseUri, express.static(staticDir))

  // see how to use pug http://expressjs.com/ja/guide/using-template-engines.html
  app.set('view engine', 'pug')
  app.use((req, res, next) => {
    res.locals.staticBaseUri = staticBaseUri
    res.locals.session = req.session
    next()
  })

  app.get('/login', (req, res) => res.render('login'))
  app.post('/login', async (req, res) => {
    const user = await db.get(
      'select id, uid, name from users where name = ? AND password = ?',
      req.body.name, hashPassword(req.body.password),
    )

    req.session.user = user
    res.redirect('/')
  })
  app.get('/register', (req, res) => res.render('register'))
  app.post('/register', async (req, res) => {
    const errors = []
    if (req.body.name.length > 300) {
      errors.push('Username should be less than 300')
    }
    if (errors.length > 0) {
      return res.render('register', { errors })
    }

    const uid = await generateUid(db)
    try {
      await db.run(
        'insert into users (uid, name, password) values (?, ?, ?)',
        uid, req.body.name, hashPassword(req.body.password)
      )

      // create user directory
      const dirname = path.join(rawStaticDir, uid)
      fs.mkdirSync(dirname)

      res.redirect('/')
    } catch (err) {
      errors.push(err)
      return res.render('register', { errors })
    }
  })

  // require login for below processes
  app.use((req, res, next) => {
    if (!req.session.user || !req.session.user.id) {
      return res.redirect('/login')
    }
    next()
  })

  app.get('/', (req, res) => {
    const scrapsDir = path.join(rawStaticDir, req.session.user.uid)
    fs.readdir(scrapsDir, (err, files) => {
      if (err) {
        files = []
      }
      res.render('index', { files })
    })
  })

  app.get('/logout', (req, res) => {
    req.session.user = null
    res.redirect('/')
  })

  app.get('/new', (req, res) => res.render('new'))
  app.post('/new', (req, res) => {
    // check body
    const title = req.body.title.toString()
    const body = req.body.body.toString()
    const { errors: titleErrors } = isTitleValid(title)
    const { errors: bodyErrors } = isBodyValid(body)
    const errors = [ ...titleErrors, ...bodyErrors ]
    if (errors.length > 0) {
      return res.render('new', { errors })
    }

    const filename = path.join(rawStaticDir, req.session.user.uid, title)
    fs.writeFileSync(filename, body)
    res.redirect(`/scraps/${req.session.user.uid}/${title}`)
  })
  app.post('/edit', (req, res) => {
    // check body
    const title = req.body.title.toString()
    const body = req.body.body.toString()
    const { errors: titleErrors } = isTitleValid(title)
    const { errors: bodyErrors } = isBodyValid(body)
    const errors = [ ...titleErrors, ...bodyErrors ]
    if (errors.length > 0) {
      return res.redirect(`/scraps/${req.session.user.uid}/${title}`)
    }

    const filename = path.join(rawStaticDir, req.session.user.uid, title)
    fs.writeFileSync(filename, body)
    res.redirect(`/scraps/${req.session.user.uid}/${title}`)
  })

  app.post('/report', async (req, res) => {
    const doReport = async () => {
      if (!req.body.url.startsWith(config.serverUrl)) {
        res.json({ success: false })
        return
      }

      // you don't need to report to yourself
      if (req.body.to === req.session.user.uid) {
        res.json({ success: false })
        return
      }

      try {
        await db.run(
          'insert into reports (uid, url, title, body) values (?, ?, ?, ?)',
          req.body.to, req.body.url, req.body.title, req.body.body
        )
      } catch (err) {
        return res.json({ success: false })
      }
      res.json({ success: true })
    }

    // only admin can bypass recaptcha
    if (req.session.user.uid === 'admin') {
      await doReport()
    } else {
      // check captcha
      recaptcha.verify(req, async (error, data) => {
        if (error) {
          res.json({ success: false })
        } else {
          await doReport()
        }
      })
    }
  })
  app.get('/reports', async (req, res) => {
    const reports = await db.all(
      'select url, title, body from reports where uid = ?',
      req.session.user.uid
    )
    res.json({ reports })
  })

  app.get('/scraps/:uid/:title', async (req, res) => {
    const user = await db.get('select * from users where uid = ?', req.params.uid)
    res.render('scrap', {
      user,
      title: req.params.title,
      captcha: recaptcha.render()
    })
  })

  app.listen(3000)
}
startApp()
