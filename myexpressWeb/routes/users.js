//  主要功能：處理使用者的登入、註冊、登出和資料查詢。有五支 API：
// POST /api/users/login：接收帳號密碼，驗證成功後把 userId 存進 session，回傳使用者資料給前端。
// POST /api/users/register：接收帳號密碼，註冊成功後回傳成功訊息給前端。
// GET /api/users/me：用來確認目前 session 的登入狀態，如果已登入就回傳使用者資料給前端。
// POST /api/users/logout：清掉 server 端 session 與 cookie，完成登出。
// GET /api/users/:id：依照 id 讀取指定使用者資料，通常用在同步最新積分。


import express from 'express'

import { db } from '../database/db.js'

const router = express.Router()

// 把帳號密碼先整理成穩定格式，避免使用者不小心多打一個空白時，資料表看起來有值但登入永遠比對不到。
function normalizeCredentials(username, password) {
  return {
    username: typeof username === 'string' ? username.trim() : '',
    password: typeof password === 'string' ? password.trim() : '',
  }
}

// 登入成功後把 userId 存進 session，之後其他 API 就能辨識目前登入者。
router.post('/login', (req, res) => {
  const { username, password } = normalizeCredentials(req.body.username, req.body.password)

  if (!username || !password) {
    return res.status(400).json({ message: '請輸入帳號和密碼' })
  }

  // 帳號比對改成不分大小寫，像 Email 這類帳號在使用者認知上通常也不會區分大小寫。
  db.get(
    'SELECT id, username, points FROM users WHERE lower(username) = lower(?) AND password = ?',
    [username, password],
    (err, row) => {
    if (err) return res.status(500).json(err)
    if (!row) return res.status(401).json({ message: '帳號或密碼錯誤' })

    req.session.userId = row.id
    return res.json(row)
    },
  )
})

// 註冊只需要帳號和密碼；註冊成功後不自動登入，前端需重新登入。
router.post('/register', (req, res) => {
  const { username, password } = normalizeCredentials(req.body.username, req.body.password)

  if (!username || !password) {
    return res.status(400).json({ message: '請輸入帳號和密碼' })
  }

  // 註冊時也用同樣規則檢查重複帳號，避免「Miracle」和「 miracle 」被當成兩個不同帳號。
  db.get('SELECT id FROM users WHERE lower(username) = lower(?)', [username], (checkErr, existing) => {
    if (checkErr) return res.status(500).json(checkErr)
    if (existing) return res.status(409).json({ message: '帳號已經存在' })

    db.run('INSERT INTO users (username, password, points) VALUES (?, ?, ?)', [username, password, 0], function handleInsert(insertErr) {
      if (insertErr) return res.status(500).json(insertErr)

      return res.status(201).json({
        message: '註冊成功，請重新登入',
      })
    })
  })
})

// 前端重新整理時，可以用這支 API 取回目前 session 的登入狀態。
router.get('/me', (req, res) => {
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ message: 'Not logged in' })

  db.get('SELECT id, username, points FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json(err)
    if (!row) return res.status(404).json({ message: 'User not found' })
    return res.json(row)
  })
})

// 登出時清掉 server 端 session 與 cookie。
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json(err)
    res.clearCookie('connect.sid')
    return res.json({ message: 'Logged out' })
  })
})

// 依照 id 讀取指定使用者資料，通常用在同步最新積分。
router.get('/:id', (req, res) => {
  db.get('SELECT id, username, points FROM users WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json(err)
    if (!row) return res.status(404).json({ message: 'User not found' })
    return res.json(row)
  })
})

export default router
