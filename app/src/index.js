const express = require('express')
const path = require('path')

const app = express()

const staticDir = path.resolve(`${__dirname}/../static`)

app.use('/static', express.static(staticDir))

app.get('/', (req, res) => {
  res.sendFile(path.resolve(`${staticDir}/index.html`))
})

app.listen(3000)
