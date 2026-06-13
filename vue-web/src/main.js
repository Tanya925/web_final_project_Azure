// 主要功能：啟動 Vue 前端應用程式，將 App.vue 元件掛載到 index.html 的 #app 元素上，讓整個網站開始運作。


import { createApp } from 'vue'  // 從 Vue 3 的核心庫引入 createApp 函式，這是用來創建 Vue 應用程式的入口函式。
import App from './App.vue'  // 引入 App.vue 元件，這是整個網站的根元件，負責控制頁面切換、登入狀態、整體版面等功能。

createApp(App).mount('#app')  // 使用 createApp() 創建一個 Vue 應用程式，並把 App 元件作為根元件傳入。然後呼叫 .mount('#app')，把這個應用程式掛載到 index.html 中 id 為 app 的元素上，讓整個網站開始運作