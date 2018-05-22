const express = require('express')
const session = require('express-session')
const path = require('path')

const app = express()

app.use(session({
  secret: 'XXXSECRETVALUE',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true }
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
})
app.get('/register', (req, res) => res.render('register'))
app.post('/register', (req, res) => {
})

// require login below
app.use((req, res, next) => {
  if (!req.session.isLogin) {
    return res.redirect('/login')
  }
  next()
})

app.get('/', (req, res) => res.render('index'))

app.get('/new', (req, res) => res.render('new'))
app.post('/new', (req, res) => {
})

app.get('/scrap/:title', (req, res) => {
  res.render('scrap')
})

app.get('/config', (req, res) => res.render('config'))
app.post('/config', (req, res) => {
})

app.listen(3000)
