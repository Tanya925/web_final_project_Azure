import axios from 'axios'

// Azure 部署時，前端與後端會由同一個網域送出，所以預設用空字串代表「跟目前網站同網域」。
// 如果之後想改成前後端分開部署，再用 VITE_API_BASE_URL 指到外部 API 即可，不需要重改每個元件。
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const api = axios.create({
  baseURL: apiBaseUrl,
  // 這個網站的登入狀態靠 cookie session 維持，所以每次 API 請求都要把 cookie 一起帶上。
  withCredentials: true,
})

// 社群貼文的圖片路徑有些是完整網址，有些是後端回傳的 /uploads/... 相對路徑。
// 這裡集中補上 API 網域，避免部署後圖片還指回 localhost。
export function buildAssetUrl(resourcePath) {
  if (!resourcePath) {
    return ''
  }

  if (resourcePath.startsWith('http://') || resourcePath.startsWith('https://') || resourcePath.startsWith('data:')) {
    return resourcePath
  }

  return apiBaseUrl ? `${apiBaseUrl}${resourcePath}` : resourcePath
}
