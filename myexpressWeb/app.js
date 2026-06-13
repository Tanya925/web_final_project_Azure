// 主要功能：設定 Express 伺服器，並把各功能的路由集中在這裡掛載。(後端指揮中心)


import fs from 'fs';
import express from 'express';  // 引入 Express 框架，讓我們可以建立路由和處理 HTTP 請求
import path from 'path';  // Node.js 內建的 path 模組，幫助我們處理檔案路徑
import cookieParser from 'cookie-parser';  // 解析 HTTP 請求中的 Cookie，讓我們可以在 req.cookies 中使用
import session from 'express-session' // 用來在 server 端建立 session（以 cookie 綁定使用者登入狀態）

// 引入 CORS 中介層，讓我們可以設定哪些網域可以訪問這個後端 API
// 因為：Vue 前端(localhost:5173)、Node 後端(localhost:3000) 是不同 Port，瀏覽器會擋掉。所以 CORS 可以允許這兩個不同 Port 之間的溝通！！！
import cors from 'cors';  

import logger from 'morgan';  // 引入 morgan 中介層，讓我們可以在終端機看到每次 HTTP 請求的紀錄
import { fileURLToPath } from 'url';  // 這兩行是為了在 ES 模組中取得 __dirname 的替代方案，因為 ES 模組沒有內建 __dirname 變數


import { initializeDatabase } from './database/initDb.js';  // 引入資料庫初始化的功能，確保在伺服器啟動前資料表和預設資料都已建立好
import { ensureUploadsDir } from './storagePaths.js';
import challengesRouter from './routes/challenges.js';  // 引入挑戰任務相關的路由，提供 /api/challenges 的 API
import indexRouter from './routes/index.js';  // 引入根路徑的路由，提供 / 的 API
import postsRouter from './routes/posts.js';  // 引入社群貼文相關的路由，提供 /api/posts 的 API
import quizRouter from './routes/quiz.js';  // 引入測驗相關的路由，提供 /api/quiz 的 API
import sdgsRouter from './routes/sdgs.js';  // 引入 SDGs 相關的路由，提供 /api/sdgs 的 API
import usersRouter from './routes/users.js';  // 引入使用者相關的路由，提供 /users 的 API

// 取得目前目錄
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistDir = path.resolve(__dirname, '../vue-web/dist');
const hasBuiltClient = fs.existsSync(path.join(clientDistDir, 'index.html'));
const allowedOrigins = new Set(
	[
		'http://localhost:5173',
		process.env.FRONTEND_ORIGIN,
		process.env.WEBSITE_HOSTNAME ? `https://${process.env.WEBSITE_HOSTNAME}` : null,
		process.env.WEBSITE_HOSTNAME ? `http://${process.env.WEBSITE_HOSTNAME}` : null,
	].filter(Boolean),
);

// 伺服器啟動前，先確保資料表和預設資料都已建立好。
await initializeDatabase();
const uploadsDir = ensureUploadsDir();

const app = express();  // 建立 Express 應用程式的實例，這個 app 就是我們的伺服器，可以用來設定路由和中介層

// Azure App Service 會把真正的 HTTPS 連線終止在前面的 Proxy。
// 這裡信任第一層 Proxy，Express 才能正確辨識目前請求是否走 HTTPS，session 的 secure cookie 才不會在 Azure 上失效。
app.set('trust proxy', 1);

// 這裡集中設定後端共用中介層，例如 CORS、JSON 解析與靜態資源。
// 啟用 CORS 並允許前端（Vite dev server）帶 cookie（credentials）以支援 session。
app.use(logger('dev'));
app.use(
	cors({
		// 本機開發時允許 Vite；部署到 Azure 後，前後端會同網域，所以直接回傳目前請求的 Origin 即可。
		// 這樣可以同時支援本機與 Azure，而不會把正式站卡死在 localhost。
		origin(origin, callback) {
			if (!origin || allowedOrigins.has(origin)) {
				callback(null, true);
				return;
			}

			callback(new Error('Not allowed by CORS'));
		},
		credentials: true,
	}),
)
// 因為社群貼文現在可直接上傳圖片，這裡把可接收的資料大小放寬。
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// 把 uploads 目錄公開成靜態路徑，之後資料庫只要存 /uploads/檔名 就能顯示圖片。
app.use('/uploads', express.static(uploadsDir));

// 設定 express-session（開發環境簡單設定）。請勿用在高流量/生產環境的預設 memory store。
app.use(
	session({
		secret: 'change-this-secret-in-prod',
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			// Azure 正式站會走 HTTPS；secure cookie 搭配 trust proxy 才能讓登入 session 在雲端環境穩定保留。
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 24 * 60 * 60 * 1000, // 1 天
		},
	}),
)


// 各功能 API 依照主題拆成不同路由檔，方便後續維護。
//(網址前綴, 交給哪個 Router 處理)
// 網站首頁之後要交給 Vue 打包出的 index.html，所以把後端健康檢查改掛在 /api。
// 這樣 Azure 進站根路徑時會看到前端畫面，不會只拿到一段 JSON。
app.use('/api', indexRouter);
app.use('/api/sdgs', sdgsRouter);  // 像這個就代表說，當有人訪問 /api/sdgs 的時候，就會把這個請求交給 sdgsRouter 來處理，然後 sdgsRouter 就會去 routes/sdgs.js 裡面找對應的 API 來回應這個請求。
app.use('/api/challenges', challengesRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/posts', postsRouter);
app.use('/users', usersRouter);

// Azure 部署時只啟動這個 Express 服務，所以這裡直接把 Vue build 後的靜態檔一起送出。
// 這樣免費版 App Service 不需要額外再開第二個前端服務，部署成功率最高。
if (hasBuiltClient) {
	app.use(express.static(clientDistDir));
}

// 如果請求不是 API、不是上傳檔案，就回傳前端的 index.html，讓單一網站入口在 Azure 上可直接打開。
app.get(/^(?!\/api|\/users|\/uploads).*/, (req, res) => {
	if (!hasBuiltClient) {
		res.status(503).json({ message: 'Frontend build not found yet' });
		return;
	}

	res.sendFile(path.join(clientDistDir, 'index.html'));
});

export default app;  // 把這個 app 匯出，讓 bin/www.js 可以引入使用，啟動伺服器
