const express = require('express')
const session = require('express-session')
const path = require('path')
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3')
const fs = require('fs')
const Recaptcha = require('express-recaptcha').Recaptcha;
const crypto = require('crypto')
const config = require('../../config.js')

const recaptcha = new Recaptcha(config.recaptcha.siteKey, config.recaptcha.secretKey);

const hashPassword = (password) => {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  return hash.digest('hex')
}

const db = new sqlite3.Database('scrap.db')
db.serialize(() => {
  db.get('select count(*) from sqlite_master', (err, res) => {
    if (res['count(*)'] == 0) {
      db.run('create table users (id integer primary key, uid text, name text unique, password text)')
      db.run('create table reports (id integer primary key, user_id integer, url text, title text, body text)')
    }
  })
})

const generateUid = async () => {
  const isUidUnique = (uid) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.get('select * from users where uid = ?', uid, (err, user) => {
          resolve(user === undefined)
        })
      })
    })
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
app.post('/login', (req, res) => {
  db.serialize(() => {
    db.get(
      'select id, name from users where name = ? AND password = ?',
      req.body.name, hashPassword(req.body.password),
      (err, user) => {
        req.session.user = user
        res.redirect('/')
      }
    )
  })
})
app.get('/register', (req, res) => res.render('register'))
app.post('/register', async (req, res) => {
  // TODO: hash password
  const errors = []
  if (req.body.name.length > 80) {
    errors.push('Username should be less than 80')
  }
  if (errors.length > 0) {
    return res.render('register', { errors })
  }

  const uid = await generateUid()
  db.run(
    'insert into users (uid, name, password) values (?, ?, ?)',
    uid, req.body.name, hashPassword(req.body.password),
    function (err, user) {
      if (err) {
        errors.push(err)
        return res.render('register', { errors })
      }

      const dirname = path.join(rawStaticDir, this.lastID.toString())
      fs.mkdirSync(dirname)

      res.redirect('/')
    }
  )
})

// require login below
app.use((req, res, next) => {
  if (!req.session.user || !req.session.user.id) {
    return res.redirect('/login')
  }
  next()
})

app.get('/', (req, res) => {
  const scrapsDir = path.join(rawStaticDir, req.session.user.id.toString())
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
  if (/[^0-9a-zA-Z '.\n\r/\-]/.test(body)) {
    errors.push('You cannot use unsafe character')
  }
  return {
    success: errors.length === 0,
    errors
  }
}

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

  const filename = path.join(rawStaticDir, req.session.user.id.toString(), title)
  fs.writeFileSync(filename, body)
  res.redirect(`/scraps/${req.session.user.id}/${title}`)
})
app.post('/edit', (req, res) => {
  // check body
  const title = req.body.title.toString()
  const body = req.body.body.toString()
  const { errors: titleErrors } = isTitleValid(title)
  const { errors: bodyErrors } = isBodyValid(body)
  const errors = [ ...titleErrors, ...bodyErrors ]
  if (errors.length > 0) {
    return res.redirect(`/scraps/${req.session.user.id}/${title}`)
  }

  const filename = path.join(rawStaticDir, req.session.user.id.toString(), title)
  fs.writeFileSync(filename, body)
  res.redirect(`/scraps/${req.session.user.id}/${title}`)
})

app.post('/report', (req, res) => {
  const doReport = () => {
    if (!req.body.url.startsWith(config.serverUrl)) {
      res.json({ success: false })
      return
    }

    db.run(
      'insert into reports (user_id, url, title, body) values (?, ?, ?, ?)',
      req.body.to, req.body.url, req.body.title, req.body.body,
      function (err, user) {
        res.json({ success: true })
      }
    )
  }

  // only admin can bypass recaptcha
  if (req.session.user.id === 1) {
    doReport()
  } else {
    // check captcha
    recaptcha.verify(req, (error, data) => {
      if (error) {
        res.json({ success: false })
      } else {
        doReport()
      }
    })
  }
})
app.get('/reports', (req, res) => {
  db.serialize(() => {
    db.all(
      'select url, title, body from reports where user_id = ?',
      req.session.user.id,
      (err, reports) => {
        res.json({ reports })
      }
    )
  })
})

app.get('/scraps/:user_id/:title', (req, res) => {
  // admin and owner can view scrap
  db.serialize(() => {
    db.get('select * from users where id = ?', req.params.user_id, (err, user) => {
      res.render('scrap', {
        user,
        title: req.params.title,
        captcha: recaptcha.render()
      })
    })
  })
})

app.listen(3000)
