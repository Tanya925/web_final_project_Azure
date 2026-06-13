import fs from 'fs'  // fs 是 Node.js 內建的檔案系統工具
import path from 'path'  // path 是處理路徑用的
import sqlite3 from 'sqlite3'  // 操作 SQLite 資料庫的套件
import { fileURLToPath } from 'url'  // 這兩行是為了在 ES 模組中取得 __dirname 的替代方案，因為 ES 模組沒有內建 __dirname 變數

const __filename = fileURLToPath(import.meta.url)  // 取得目前檔案完整路徑
const __dirname = path.dirname(__filename)  // 取得目前檔案所在資料夾
const seedDbPath = path.join(__dirname, 'sdgs.db')

function resolveDbPath() {
  if (process.env.DB_PATH) {
    // 讓每個網站可以用自己的 DB_PATH 明確指定資料庫檔案。
    // 這樣就算 web_final_project 和 web_final_project_Azure 程式碼一樣，也能被當成兩個不同網站，各自連到自己的資料。
    return path.isAbsolute(process.env.DB_PATH)
      ? process.env.DB_PATH
      : path.resolve(process.cwd(), process.env.DB_PATH)
  }

  const databaseDir = process.env.HOME
    // Azure App Service 的 HOME 目錄是可寫且可持久化的，資料庫放這裡才能避免重新部署後資料消失。
    ? path.join(process.env.HOME, 'data')
    : __dirname

  return path.join(databaseDir, 'sdgs.db')
}

const dbPath = resolveDbPath()  // 設定資料庫檔案位置
const dbDirectory = path.dirname(dbPath)

// 如果 database 資料夾不存在，就先建立起來。
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true })
}

// 如果目前要使用的資料庫檔還不存在，就先用 repo 內建的初始 sdgs.db 複製一份。
// 這樣本地和 Azure 可以從同一份起始資料開始，但 Azure 之後會在自己的持久化位置獨立演化，不會回頭改到 repo 內那份檔案。
if (dbPath !== seedDbPath && !fs.existsSync(dbPath) && fs.existsSync(seedDbPath)) {
  fs.copyFileSync(seedDbPath, dbPath)
}

sqlite3.verbose()  // 讓 sqlite3 顯示比較詳細的錯誤資訊

// [編號, 中文標題, 英文標題, 說明]
const sdgSeeds = [
  [1, '消除貧窮', 'No Poverty', '消除各種形式的貧窮，讓所有人都能獲得基本資源與發展機會。'],
  [2, '消除飢餓', 'Zero Hunger', '確保人人都能取得足夠且營養的食物，同時推動永續農業。'],
  [3, '良好健康與福祉', 'Good Health and Well-being', '促進身心健康、預防疾病，提升所有年齡層的生活品質。'],
  [4, '優質教育', 'Quality Education', '提供公平且高品質的教育，鼓勵終身學習與多元能力培養。'],
  [5, '性別平等', 'Gender Equality', '消除性別歧視與暴力，讓每個人都能平等參與社會。'],
  [6, '潔淨水與衛生', 'Clean Water and Sanitation', '確保安全用水、衛生設施與水資源的永續管理。'],
  [7, '可負擔的潔淨能源', 'Affordable and Clean Energy', '推動穩定、可負擔且永續的能源使用與再生能源發展。'],
  [8, '合適的工作及經濟成長', 'Decent Work and Economic Growth', '促進包容的經濟成長與有尊嚴、安全的工作環境。'],
  [9, '產業創新與基礎建設', 'Industry, Innovation and Infrastructure', '建立具韌性的基礎建設，鼓勵創新與永續產業升級。'],
  [10, '減少不平等', 'Reduced Inequalities', '降低社會、經濟與機會上的不平等，提升包容性。'],
  [11, '永續城鄉', 'Sustainable Cities and Communities', '打造安全、韌性且宜居的城市與社區。'],
  [12, '責任消費與生產', 'Responsible Consumption and Production', '減少浪費，提倡負責任的消費方式與資源循環。'],
  [13, '氣候行動', 'Climate Action', '採取具體行動減緩氣候變遷，並提升調適能力。'],
  [14, '水下生命', 'Life Below Water', '保護海洋與水域生態，減少污染與過度開發。'],
  [15, '陸域生命', 'Life on Land', '守護森林、土地與生物多樣性，避免生態破壞。'],
  [16, '和平正義與健全制度', 'Peace, Justice and Strong Institutions', '促進和平、法治、透明制度與公平正義。'],
  [17, '促進目標實現的夥伴關係', 'Partnerships for the Goals', '透過跨領域與跨國合作，一起推動永續發展。'],
]

// 把中文和英文合併成同一個 title 欄位，這樣前端只讀 title 就能穩定顯示完整名稱。
function buildCombinedTitle(chineseTitle, englishTitle) {
  return `${chineseTitle}\n${englishTitle}`
}

// [任務id, SDG id, 任務名稱, 積分]
const challengeSeeds = [
  [1, 1, '整理一份可分享的二手物資清單', 10],
  [2, 1, '參與一次校內公益募集活動', 10],
  [3, 2, '記錄一餐惜食行動', 10],
  [4, 2, '分享一種支持在地農產的做法', 10],
  [5, 3, '完成一次 20 分鐘校園運動', 10],
  [6, 3, '記錄一個照顧心理健康的方法', 10],
  [7, 4, '分享一則 SDGs 學習筆記', 10],
  [8, 4, '幫助同學解釋一個課堂概念', 10],
  [9, 5, '觀察一個性別友善校園細節', 10],
  [10, 5, '提出一個減少刻板印象的建議', 10],
  [11, 6, '完成一次節水紀錄', 10],
  [12, 6, '整理一處公共衛生環境', 10],
  [13, 7, '離開教室前關閉未使用電源', 10],
  [14, 7, '分享一個再生能源案例', 10],
  [15, 8, '完成一次公平分工合作', 10],
  [16, 8, '記錄一個提升團隊效率的方法', 10],
  [17, 9, '提出一個校園永續創新點子', 10],
  [18, 9, '蒐集一組校園環保數據', 10],
  [19, 10, '協助一位需要幫助的同學', 10],
  [20, 10, '拍下無障礙或包容設施', 10],
  [21, 11, '記錄一個你喜歡的校園公共空間', 10],
  [22, 11, '完成一次低碳移動到校', 10],
  [23, 12, '使用環保餐具', 10],
  [24, 12, '自備水壺', 10],
  [25, 13, '統計一天節能成果', 10],
  [26, 13, '分享一個減碳生活選擇', 10],
  [27, 14, '減少一次性塑膠用品', 10],
  [28, 14, '整理一個海洋保育重點', 10],
  [29, 15, '觀察一種校園植物或昆蟲', 10],
  [30, 15, '參與一次綠地維護行動', 10],
  [31, 16, '實踐一次尊重溝通', 10],
  [32, 16, '提出一個讓制度更透明的建議', 10],
  [33, 17, '和同學合作完成一件永續小事', 10],
  [34, 17, '分享一個可合作的夥伴對象', 10],
]

// 測驗題目
// [題目, A選項, B選項, C選項, D選項, 正確答案]
const quizSeeds = [
  ['哪一個目標強調責任消費與生產？', 'SDG 9', 'SDG 12', 'SDG 5', 'SDG 17', 'B'],
  ['哪一種行動最符合氣候行動？', '增加一次性用品', '記錄節電成果', '浪費食物', '忽略碳排', 'B'],
  ['SDG 4 主要關注哪個面向？', '優質教育', '水下生命', '潔淨能源', '消除飢餓', 'A'],
  ['哪一項最符合 SDG 6？', '節約用水', '濫用塑膠', '忽略衛生', '浪費電力', 'A'],
  ['SDG 5 著重於什麼？', '性別平等', '海洋保育', '減少飢餓', '基礎建設', 'A'],
  ['下列哪項有助於 SDG 11？', '維護公共空間安全', '隨意破壞綠地', '增加污染', '忽略交通安全', 'A'],
  ['SDG 14 關注哪個領域？', '陸地交通', '水下生命', '高等教育', '經濟成長', 'B'],
  ['推動夥伴合作對應哪個目標？', 'SDG 17', 'SDG 2', 'SDG 7', 'SDG 10', 'A'],
]

// 貼文範例
// [使用者id, 貼文內容, 圖片網址, 建立時間]
const postSeeds = [
  [1, '今天自備餐盒和水壺，少用了好多一次性用品。', 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=900&q=80', '2026-06-10 09:00:00'],
  [1, '和同學一起整理回收站，順便學會更正確的分類方式。', 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80', '2026-06-10 11:30:00'],
]

// 建立資料庫連線的函式，其他地方要操作資料庫時就呼叫這個函式來取得連線。
export function createDatabaseConnection() {
  return new sqlite3.Database(dbPath)
}

// 把 sqlite3 的 callback 形式包成 Promise，後面比較好用 async/await。
// run: 執行 SQL 語句但不回傳資料（例如 CREATE、INSERT、UPDATE、DELETE）
function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleRun(error) {
      if (error) {
        reject(error)
        return
      }
      resolve(this)
    })
  })
}

// get: 執行 SQL 語句並回傳單一資料列（例如 SELECT 單筆資料）
function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }
      resolve(row)
    })
  })
}

// all: 執行 SQL 語句並回傳多筆資料列（例如 SELECT 多筆資料）
function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error)
        return
      }

      resolve(rows)
    })
  })
}

// 檢查資料表目前有哪些欄位，讓舊版資料庫也能在啟動時自動補齊缺少的欄位。
async function hasColumn(db, tableName, columnName) {
  const columns = await all(db, `PRAGMA table_info(${tableName})`)
  return columns.some((column) => column.name === columnName)
}


// 啟動伺服器前先建好資料表，必要時再塞入預設資料。
export async function initializeDatabase() {
  const db = createDatabaseConnection()

  // 建立 "sdgs" 資料表，如果已經存在就不會重複建立。
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS sdgs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER,
      title TEXT,
      description TEXT
    )`,
  )

  // 建立 "challenges" 資料表，紀錄任務的 SDG 類別、名稱和積分，這樣就算重啟伺服器也不會不見。
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY,
      sdg_id INTEGER,
      title TEXT,
      points INTEGER
    )`,
  )

  // 建立 "users" 資料表，紀錄使用者帳號密碼和積分，這樣就算重啟伺服器也不會不見。
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      password TEXT,
      points INTEGER DEFAULT 0
    )`,
  )

  // 建立 "user_challenges" 資料表，紀錄使用者完成了哪些任務，這樣就算重啟伺服器也不會不見。
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS user_challenges (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      challenge_id INTEGER,
      completed INTEGER
    )`,
  )

  // 建立 "quiz_questions" 資料表，紀錄測驗題目和選項。
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY,
      question TEXT,
      optionA TEXT,
      optionB TEXT,
      optionC TEXT,
      optionD TEXT,
      answer TEXT
    )`,
  )

  // 建立 "posts" 資料表，紀錄使用者的貼文內容和圖片。
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      content TEXT,
      image TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  // 如果資料庫裡沒有 SDG 資料，就把預設的 17 個 SDG 資料塞進去。
  const sdgCount = await get(db, 'SELECT COUNT(*) AS count FROM sdgs')
  if (!sdgCount.count) {
    for (const sdg of sdgSeeds) {
      // 新資料直接把中英文一起寫進 title（中文與英文用換行分隔），不另外儲存獨立 english_title。
      const combinedTitle = buildCombinedTitle(sdg[1], sdg[2])
      await run(
        db,
        'INSERT INTO sdgs (number, title, description) VALUES (?, ?, ?)',
        [sdg[0], combinedTitle, sdg[3]],
      )
    }
  }


  // 如果資料庫裡沒有任務資料，就把預設的任務資料塞進去。
  const challengeCount = await get(db, 'SELECT COUNT(*) AS count FROM challenges')
  if (!challengeCount.count) {
    for (const challenge of challengeSeeds) {
      await run(
        db,
        'INSERT INTO challenges (id, sdg_id, title, points) VALUES (?, ?, ?, ?)',
        challenge,
      )
    }
  }


  // 如果資料庫裡沒有測驗題目資料，就把預設的測驗題目資料塞進去。
  const quizCount = await get(db, 'SELECT COUNT(*) AS count FROM quiz_questions')
  if (!quizCount.count) {
    for (const quiz of quizSeeds) {
      await run(
        db,
        'INSERT INTO quiz_questions (question, optionA, optionB, optionC, optionD, answer) VALUES (?, ?, ?, ?, ?, ?)',
        quiz,
      )
    }
  }

  // 如果資料庫裡沒有貼文資料，就把預設的貼文資料塞進去。
  const postCount = await get(db, 'SELECT COUNT(*) AS count FROM posts')
  if (!postCount.count) {
    for (const post of postSeeds) {
      await run(
        db,
        'INSERT INTO posts (user_id, content, image, created_at) VALUES (?, ?, ?, ?)',
        post,
      )
    }
  }

  db.close()
}

export { dbPath }  // 匯出資料庫路徑，讓其他地方也能知道資料庫檔案在哪裡。
