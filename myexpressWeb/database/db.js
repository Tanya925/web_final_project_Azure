// 主要功能：建立一個共用的 SQLite 資料庫連線，讓其他 route 可以直接使用


import sqlite3 from 'sqlite3'

import { createDatabaseConnection } from './initDb.js'  // 從：initDb.js 引入：createDatabaseConnection() 這個函式

sqlite3.verbose()  // 開啟 sqlite3 詳細模式，錯誤訊息會較完整

// 提供整個後端共用的資料庫連線！！
export const db = createDatabaseConnection()