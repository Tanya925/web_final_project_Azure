// 主要功能：「永續挑戰打卡功能」的後端 API 檔案，提供 3 個 API：
// GET  /api/challenges
// POST /api/challenges/complete
// POST /api/challenges/reset


import express from 'express'  // 引入 Express 框架
import { db } from '../database/db.js'  // 匯入共用資料庫連線 db

const router = express.Router()  // 建立一個 Express 路由物件
const BONUS_POINTS = 50  // 代表全部任務完成後，額外加 50 分


// 1. API 功能：取得某位使用者的所有挑戰任務，並一起回傳完成進度摘要。
router.get('/', (req, res) => {
  // 從 session 取得 userId（改成 session 驗證，若未登入回傳 401）
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ message: 'Please login' })

  // 查詢任務資料表(可以查出所有任務、每個任務對應的 sdgS 名稱、該使用者是否完成該任務)
  // completed = 1 代表該任務完成、completed = 0 代表未完成
  db.all(
    `SELECT
      c.id,
      c.sdg_id,
      s.title AS sdg_title,
      c.title,
      c.points,
      COALESCE(uc.completed, 0) AS completed
    FROM challenges c
    LEFT JOIN sdgs s
      ON s.number = c.sdg_id
    LEFT JOIN user_challenges uc
      ON uc.challenge_id = c.id
      AND uc.user_id = ?
    ORDER BY c.sdg_id ASC, c.id ASC`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json(err)
      }
      
      // 查總任務數
      db.get(
        'SELECT COUNT(*) AS totalCount FROM challenges',
        [],
        (totalErr, totalRow) => {
          if (totalErr) {
            return res.status(500).json(totalErr)
          }

          // 查已完成任務數
          db.get(
            'SELECT COUNT(*) AS completedCount FROM user_challenges WHERE user_id = ? AND completed = 1',
            [userId],
            (completedErr, completedRow) => {
              if (completedErr) {
                return res.status(500).json(completedErr)
              }
              
    
              // 回傳任務列表和摘要
              // 1. items: 全部任務列表
              // 2. summary: 任務進度摘要，包含：總任務數、已完成任務數、是否全部完成、重置後可獲得的額外積分
              return res.json({
                items: rows,
                summary: {
                  totalCount: totalRow.totalCount,
                  completedCount: completedRow.completedCount,
                  allCompleted: totalRow.totalCount > 0 && totalRow.totalCount === completedRow.completedCount,
                  bonusPoints: BONUS_POINTS,
                },
              })
            },
          )
        },
      )
    },
  )
})


// 2. API 功能：完成單一任務：寫入完成紀錄、加分，並告知前端是否已可重置整輪任務。
router.post('/complete', (req, res) => {
  // 使用 session 的 userId，前端不用再傳 userId
  const { challengeId } = req.body
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ message: 'Please login' })

  if (!challengeId) {
    return res.status(400).json({ message: 'challengeId is required' })
  }

  // 主要就是要: 找這個任務、取得這個任務的分數、檢查使用者是否已完成過這個任務
  db.get(
    `SELECT
      c.id,
      c.points,
      uc.completed
    FROM challenges c
    LEFT JOIN user_challenges uc
      ON uc.challenge_id = c.id
      AND uc.user_id = ?
    WHERE c.id = ?`,
    [userId, challengeId],
    (checkErr, row) => {
      if (checkErr) {  // 如果資料庫錯誤
        return res.status(500).json(checkErr)
      }

      if (!row) {  // 如果任務不存在
        return res.status(404).json({ message: 'Challenge not found' })
      }

      if (row.completed) {  // 如果已經完成過了，就不重複加分了，直接告訴前端這個任務已經完成過了
        return res.status(409).json({ message: 'Challenge already completed' })
      }

      // 否則，寫入完成紀錄
      db.run(
        'INSERT INTO user_challenges (user_id, challenge_id, completed) VALUES (?, ?, 1)',
        [userId, challengeId],
        (insertErr) => {
          if (insertErr) {
            return res.status(500).json(insertErr)
          }
          
          // 幫該使用者加分
          db.run(
            'UPDATE users SET points = points + ? WHERE id = ?',
            [row.points, userId],
            (updateErr) => {
              if (updateErr) {
                return res.status(500).json(updateErr)
              }

              // 查目前這個使用者完成了多少任務、總共有多少任務，告訴前端是否已經全部完成，可以重置了
              db.get(
                'SELECT COUNT(*) AS total FROM challenges',  // 查總任務數
                [],
                (countErr, totalRow) => {
                  if (countErr) {
                    return res.status(500).json(countErr)
                  }

                  db.get(
                    'SELECT COUNT(*) AS completed FROM user_challenges WHERE user_id = ? AND completed = 1',  // 查已完成任務數
                    [userId],
                    (completedErr, completedRow) => {
                      if (completedErr) {
                        return res.status(500).json(completedErr)
                      }

                      // 查出目前使用者資料(ID、username、目前積分)，一起回傳給前端
                      db.get(
                        'SELECT id, username, points FROM users WHERE id = ?',
                        [userId],
                        (userErr, user) => {
                          if (userErr) {
                            return res.status(500).json(userErr)
                          }

                          // 如果總任務數 = 已完成任務數，代表全部完成
                          const allDone = totalRow.total === completedRow.completed
                          
                          // 完成任務後回傳資料
                          return res.json({
                            message: allDone ? 'All challenges completed' : 'Challenge completed',
                            challengeId,
                            awardedPoints: row.points,
                            bonusAwarded: 0,
                            cycleReset: false,
                            canReset: allDone,
                            user,
                          })
                        },
                      )
                    },
                  )
                },
              )
            },
          )
        },
      )
    },
  )
})


// 3. API 功能：全部任務完成後，額外加分並清空完成紀錄，讓整輪任務重新開始。
router.post('/reset', (req, res) => {
  // 從 session 取得 userId，若未登入則回傳 401
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ message: 'Please login' })  // 取得 userId，但未登入就拒絕

  // 查總任務數
  db.get('SELECT COUNT(*) AS totalCount FROM challenges', [], (totalErr, totalRow) => {
    if (totalErr) {
      return res.status(500).json(totalErr)
    }

    // 查完成任務數
    db.get(
      'SELECT COUNT(*) AS completedCount FROM user_challenges WHERE user_id = ? AND completed = 1',
      [userId],
      (completedErr, completedRow) => {
        if (completedErr) {
          return res.status(500).json(completedErr)
        }

        // 判斷是否全部完成
        const allCompleted =
          totalRow.totalCount > 0 && totalRow.totalCount === completedRow.completedCount

        // 如果沒全部完成，不能重置
        if (!allCompleted) {
          return res.status(400).json({ message: '尚未完成全部任務，還不能重置' })
        }

        // 否則，全部完成後，加額外積分，並重置任務完成紀錄
        db.run('UPDATE users SET points = points + ? WHERE id = ?', [BONUS_POINTS, userId], (bonusErr) => {
          if (bonusErr) {
            return res.status(500).json(bonusErr)
          }

          // 清空任務完成紀錄
          db.run('DELETE FROM user_challenges WHERE user_id = ?', [userId], (resetErr) => {
            if (resetErr) {
              return res.status(500).json(resetErr)
            }

            // 取得最新使用者目前的資料和任務列表，回傳給前端(因為剛剛加了 50 分，所以要查最新 points)
            db.get('SELECT id, username, points FROM users WHERE id = ?', [userId], (userErr, user) => {
              if (userErr) {
                return res.status(500).json(userErr)
              }

              // 重新查任務列表(而此時所有任務都會變成未完成)
              db.all(
                `SELECT
                  c.id,
                  c.sdg_id,
                  s.title AS sdg_title,
                  c.title,
                  c.points,
                  0 AS completed
                FROM challenges c
                LEFT JOIN sdgs s
                  ON s.number = c.sdg_id
                ORDER BY c.sdg_id ASC, c.id ASC`,
                [],
                (listErr, rows) => {
                  if (listErr) {
                    return res.status(500).json(listErr)
                  }

                  // 重置後回傳資料(跟前面取得任務列表的 API 回傳格式一樣，但任務完成狀態都變成 0，並且告訴前端已經獲得額外積分了)
                  return res.json({
                    message: '已獲得額外積分，任務已全部刷新，請重新整理頁面查看',
                    bonusAwarded: BONUS_POINTS,
                    user,
                    items: rows,
                    summary: {
                      totalCount: totalRow.totalCount,
                      completedCount: 0,
                      allCompleted: false,
                      bonusPoints: BONUS_POINTS,
                    },
                  })
                },
              )
            })
          })
        })
      },
    )
  })
})

export default router  // 把這個 challenges router 匯出