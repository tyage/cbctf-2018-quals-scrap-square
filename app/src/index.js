const express = require('express')
const path = require('path')

const app = express()

const staticDir = path.resolve(`${__dirname}/../static`)

// set CSP to prevent XSS
app.use((req, res, next) => {
  res.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'")
  next()
})

app.use('/static', express.static(staticDir))

app.set('view engine', 'pug')

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/new', (req, res) => {
  res.sendFile(path.resolve(`${staticDir}/new.html`))
})
app.post('/new', (req, res) => {
})

app.get('/scrap/:title', (req, res) => {
})

app.get('/config', (req, res) => {
  res.sendFile(path.resolve(`${staticDir}/config.html`))
})
app.post('/config', (req, res) => {
})

app.listen(3000)
