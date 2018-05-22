const express = require('express')
const session = require('express-session')
const path = require('path')
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3')

const db = new sqlite3.Database('scrap.db')
db.serialize(() => {
  db.get('select count(*) from sqlite_master', (err, res) => {
    if (res['count(*)'] == 0) {
      db.run('create table users (id integer primary key, name text, password text)')
      db.run('create table scraps (id integer primary key, user_id integer, title text, body text)')
    }
  })
})

const app = express()

app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(session({
  secret: 'XXXSECRETVALUE',
  resave: false,
  saveUninitialized: false
}))

// set CSP to prevent XSS
app.use((req, res, next) => {
  res.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'")
  next()
})

// serve static files
const staticBaseUri = '/static'
const staticDir = path.resolve(`${__dirname}/../static`)
app.use(staticBaseUri, express.static(staticDir))

app.set('view engine', 'pug')
app.use((req, res, next) => {
  res.locals.staticBaseUri = staticBaseUri
  res.locals.session = req.session
  next()
})

app.get('/login', (req, res) => res.render('login'))
app.post('/login', (req, res) => {
  // TODO: implement
  req.session.user = {
    id: 1,
    name: req.body.name,
    password: req.body.password
  }
  res.redirect('/')
})
app.get('/register', (req, res) => res.render('register'))
app.post('/register', (req, res) => {
})

// require login below
app.use((req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login')
  }
  next()
})

app.get('/', (req, res) => {
  db.serialize(() => {
    db.all('select * from scraps where user_id = ?', req.session.user.id, (err, rows) => {
      res.render('index', { scraps: rows })
    })
  })
})

app.get('/new', (req, res) => res.render('new'))
app.post('/new', (req, res) => {
  db.serialize(() => {
    db.run(
      'insert into scraps (user_id, title, body) values (?, ?, ?)',
      req.session.user.id, req.body.title, req.body.body
    )
    res.redirect('/')
  })
})

app.get('/scrap/:id', (req, res) => {
  res.render('scrap')
})

app.get('/config', (req, res) => res.render('config'))
app.post('/config', (req, res) => {
})

app.listen(3000)
