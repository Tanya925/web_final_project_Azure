// 主要功能：提供社群牆貼文相關的 API，讓前端可以讀取和新增貼文。有兩個 API：
// GET  /api/posts
// POST /api/posts


import express from 'express'  // 引入 Express 框架
import multer from 'multer'  // 專門處理 multipart/form-data，也就是圖片上傳表單
import path from 'path'  // 取出副檔名時會用到
import { db } from '../database/db.js'  // 匯入共用資料庫連線 db
import { ensureUploadsDir } from '../storagePaths.js'  // 確保 uploads 目錄存在，讓圖片能存進固定位置

const router = express.Router()  // 建立 posts 專屬路由
const uploadsDir = ensureUploadsDir()  // 先準備好實際存圖的資料夾，避免第一次上傳時找不到路徑。

// 使用磁碟儲存圖片檔，部署到 Azure 時也能寫到可持久的 uploads 目錄。
const storage = multer.diskStorage({
  // destination: 決定圖片檔要存到哪個資料夾。
  destination(req, file, cb) {
    cb(null, uploadsDir)
  },
  // filename: 幫每張圖產生不容易重複的新檔名。
  filename(req, file, cb) {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg'
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`
    cb(null, fileName)
  },
})

// 只允許圖片檔，並限制大小，避免使用者上傳過大的非圖片檔案。
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
      return
    }

    cb(new Error('只能上傳圖片檔案'))
  },
})


// 1. API 功能：讀取社群牆貼文，順便把發文者名稱一起查出來。
// 代表 GET /api/posts
router.get('/', (req, res) => {
  
  // 查詢貼文資料表，並且用 LEFT JOIN 把發文者名稱從 users 資料表一起查出來。
  db.all(
    `SELECT
      posts.id,
      posts.content,
      posts.image,
      posts.created_at,
      users.username
    FROM posts
    LEFT JOIN users ON users.id = posts.user_id
    ORDER BY datetime(posts.created_at) DESC, posts.id DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json(err)
      }

      return res.json(rows)
    },
  )
})


// 2. API 功能：新增一篇貼文，建立後直接回傳最新那筆資料給前端更新畫面。
// 代表 POST /api/posts
router.post('/', upload.single('image'), (req, res) => {
  // 這裡改成接收 multipart/form-data，圖片檔會在 req.file，文字內容在 req.body。
  const { content } = req.body
  // userId 從 session 取得，代表目前登入者是誰。
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ message: 'Please login' })

  // 檢查拿來的資料是否為空
  if (!content || !req.file) {
    return res.status(400).json({ message: 'content and image are required' })
  }

  // 資料庫只存圖片路徑，不再把整張圖片 base64 塞進 SQLite。
  const imagePath = `/uploads/${req.file.filename}`

  // 如果不為空，就把這筆資料寫入 posts 資料表
  db.run(
    'INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)',
    [userId, content, imagePath],
    function handleInsert(err) {
      if (err) {
        return res.status(500).json(err)
      }
      
      // 寫入完成後，這裡的 this.lastID 就會是剛剛新增的那筆貼文的 ID，所以我們可以用這個 ID 再查一次資料庫，把完整的貼文資料（包含發文者名稱）查出來，然後回傳給前端。
      db.get(
        `SELECT
          posts.id,
          posts.content,
          posts.image,
          posts.created_at,
          users.username
        FROM posts
        LEFT JOIN users ON users.id = posts.user_id
        WHERE posts.id = ?`,
        [this.lastID],
        (postErr, row) => {
          if (postErr) {
            return res.status(500).json(postErr)
          }

          // 查詢完成後，回傳這筆資料給前端(因為前端會需要再呼叫一次 GET /posts，重新載入全部貼文)
          return res.status(201).json(row)
        },
      )
    },
  )
})


// 把 multer 的上傳錯誤整理成前端較容易理解的訊息。
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: '圖片太大，請上傳 5MB 以內的檔案' })
  }

  if (err) {
    return res.status(400).json({ message: err.message || '圖片上傳失敗' })
  }

  return next()
})

export default router  // 把這個 posts router 匯出，讓 app.js 可以引入使用