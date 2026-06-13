// 主要功能：提供測驗相關的 API，讓前端可以隨機抽題和提交作答結果。有兩支 API：
// GET  /api/quiz/random
// POST /api/quiz/submit


import express from 'express'  // 引入 Express 框架
import { db } from '../database/db.js'  // 匯入共用資料庫連線 db

const router = express.Router()  // 建立 quiz 專屬路由
const POINTS_PER_QUESTION = 5  // 每題答對可以得到的積分數
const MAX_QUESTIONS = 5  // 每次測驗抽幾題


// 1. API 功能：每次隨機抽 5 題，讓前端測驗頁使用。
router.get('/random', (req, res) => {
  
  // 從 quiz_questions 資料表裡，隨機抽 5 筆資料出來，回傳給前端。
  db.all(
    `SELECT *
    FROM quiz_questions
    ORDER BY RANDOM()
    LIMIT ${MAX_QUESTIONS}`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json(err)
      }

      // 回傳抽到的題目資料給前端，前端會用這些資料來顯示題目和選項。
      return res.json(rows)
    },
  )
})


// 2. API 功能：批次接收作答結果，計算答對題數並把積分加到目前使用者身上。
router.post('/submit', (req, res) => {
  const { answers = [] } = req.body  // 取得前端資料，包含作答結果。使用 session 判斷目前使用者
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ message: 'Please login' })
  
  // 檢查拿來答案是否存在且為陣列(不一定要是正確答案，但要是選項之一)
  if (!Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ message: 'answers are required' })
  }

  const ids = answers.map((item) => item.id)  // 取得所有題目 ID
  const placeholders = ids.map(() => '?').join(',')  // 建立 SQL 佔位符

  // 查正確答案，然後計算答對題數和應該加的積分
  db.all(
    `SELECT id, answer FROM quiz_questions WHERE id IN (${placeholders})`,
    ids,
    (err, rows) => {
      if (err) {
        return res.status(500).json(err)
      }

      const answerMap = new Map(rows.map((row) => [row.id, row.answer]))  // 建立 Map，方便之後查詢答案
      const correctCount = answers.filter((item) => answerMap.get(item.id) === item.answer).length  // 計算答對數
      const awardedPoints = correctCount * POINTS_PER_QUESTION  // 計算應該加的積分

      // 更新使用者積分: 把積分加到使用者身上，然後回傳答對題數和加的積分給前端。
      db.run(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [awardedPoints, userId],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json(updateErr)
          }

          // 查詢最新使用者資料
          db.get('SELECT id, username, points FROM users WHERE id = ?', [userId], (userErr, user) => {
            if (userErr) {
              return res.status(500).json(userErr)
            }

            // 回傳答對題數、加的積分和最新使用者資料給前端，前端才能用這些資料來顯示測驗結果和更新使用者積分。
            return res.json({
              total: answers.length,
              correctCount,
              awardedPoints,
              user,
            })
          })
        },
      )
    },
  )
})

export default router  // 把這個 quiz router 匯出，讓 app.js 可以引入使用