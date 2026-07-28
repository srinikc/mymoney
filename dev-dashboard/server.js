const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
const PORT = 3099

app.use(express.static('public'))

app.get('/api/progress', (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, 'data', 'progress.json'), 'utf-8')
  res.json(JSON.parse(data))
})

app.get('/api/activity', (req, res) => {
  const lines = fs.readFileSync(path.join(__dirname, 'data', 'activity.jsonl'), 'utf-8')
    .split('\n').filter(Boolean)
  const since = req.query.since ? new Date(req.query.since) : new Date(0)
  const limit = parseInt(req.query.limit) || 50
  const filtered = lines
    .map(l => JSON.parse(l))
    .filter(e => new Date(e.ts) > since)
    .slice(-limit)
    .reverse()
  res.json(filtered)
})

app.listen(PORT, () => {
  console.log(`🛠 Dev Monitor → http://localhost:${PORT}`)
})
