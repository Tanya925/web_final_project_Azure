import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Azure App Service 會提供 HOME 環境變數；本機開發時則退回專案內的 uploads 資料夾。
export function getUploadsDir() {
  if (process.env.HOME) {
    // Azure 可持久化的空間在 HOME 底下。
    // 把上傳檔案放到 data/uploads，可以避開重新部署覆蓋網站程式碼時順手把使用者圖片一起蓋掉的風險。
    return path.join(process.env.HOME, 'data', 'uploads')
  }

  return path.join(__dirname, 'uploads')
}

// 啟動時先確保 uploads 資料夾存在，避免第一次上傳圖片就失敗。
export function ensureUploadsDir() {
  const uploadsDir = getUploadsDir()

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  return uploadsDir
}
