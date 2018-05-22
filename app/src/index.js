const express = require('express')
const path = require('path')

const app = express()

// set CSP to prevent XSS
app.use((req, res, next) => {
  res.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'")
  next()
})

const staticDir = path.resolve(`${__dirname}/../static`)
app.use('/static', express.static(staticDir))

app.set('view engine', 'pug')

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/new', (req, res) => {
  res.render('new')
})
app.post('/new', (req, res) => {
})

app.get('/scrap/:title', (req, res) => {
  res.render('scrap')
})

app.get('/config', (req, res) => {
  res.render('config')
})
app.post('/config', (req, res) => {
})

app.listen(3000)
