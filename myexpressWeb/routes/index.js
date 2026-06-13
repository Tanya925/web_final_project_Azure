// 主要功能：提供根路徑的 API，讓前端確認後端是否正常啟動。(當有人訪問網站根路徑 / 時，回傳一段 JSON 訊息，確認後端有正常運作)


import express from 'express'  // 引入 Express 框架，讓我們可以建立路由和處理 HTTP 請求

// 建立一個 Express 路由物件，這個 router 會用來定義根路徑的 API
// Express 提供：const router = express.Router()，讓每個功能自己管理自己的 API
const router = express.Router()  

// 根路徑只提供一個簡單訊息，用來確認後端有正常啟動。
router.get('/', (req, res) => {
  res.json({
    message: 'SDGs backend is running',
    sdgsApi: '/api/sdgs',
  })
})

export default router