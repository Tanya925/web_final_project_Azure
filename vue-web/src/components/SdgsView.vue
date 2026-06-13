<!--
檔案說明：SdgsView.vue - 顯示 17 個 SDG 卡牌的頁面，負責向後端取得 SDGs 資料並把每一筆資料交給 `SdgsCard` 顯示。
-->


<script setup>
import { onMounted, ref } from 'vue'  // Vue 3 的 Composition API，onMounted 是一個生命週期函式，ref 用來定義響應式資料(會變動的資料)
import { api } from '../api'  // 共用 API 設定，讓部署後 API 位置不用逐頁手動改。

import SdgsCard from './SdgsCard.vue'  // 匯入 SDG 單個卡牌元件，這樣才能在 template 裡面使用 <SdgsCard> 標籤來顯示每個 SDG 的卡牌。

const sdgs = ref([])  // 用來存放從後端 API 取得的 SDGs 資料，初始為空陣列。當 loadSdgs() 函式成功從後端取得資料後，會把資料寫到這裡，讓畫面自動更新顯示卡牌內容。所以是會存 "17個SDGs目標"
const loading = ref(true)  // 控制是否顯示：載入中...。初始為 true，代表一開始是載入中的狀態。當 loadSdgs() 函式完成資料載入後，會把 loading 設為 false，讓畫面停止顯示載入中的訊息。
const error = ref('')  // 用來顯示錯誤訊息，如果有任何 API 請求失敗，就會把錯誤訊息寫到這裡，並在畫面上顯示。

// 載入 SDGs 資料，交給卡牌元件顯示。
async function loadSdgs() {
  try {
    // 呼叫後端 API 取得 17 筆 SDGs 資料，預期會得到一個陣列，每個元素包含 SDG 的編號、中文標題、描述等欄位。
    const res = await api.get('/api/sdgs')
    // 現在資料庫的 title 已經直接存中英文合併內容，前端只要直接接資料即可。
    sdgs.value = res.data
  } catch (err) {
    error.value = '無法載入 SDGs 資料'
  }

  loading.value = false
}

// 當此頁面出現時，就自動執行 loadSdgs() 函式，從後端載入 SDGs 資料，並更新畫面顯示。
onMounted(() => {
  loadSdgs()
})
</script>

<template>
  <section class="page-shell">
    <div class="page-header">
      <p class="eyebrow">SDGs 介紹</p>
      <h2>17 個永續發展目標翻牌學習</h2>
      <p>每張卡片先顯示目標編號與名稱，點擊後翻面閱讀詳細介紹。</p>
    </div>

    <!-- v-if: 當 loading 為 true 時顯示這個元素 -->
    <p v-if="loading" class="status-text">載入中...</p>

    <!-- v-else-if: 當不是 loading 而且有 error 時顯示錯誤訊息 -->
    <p v-else-if="error" class="status-text error">{{ error }}</p>

    <!-- v-else: 其他情況（有資料）時顯示卡片清單 -->
    <div v-else class="card-grid">
      <!-- v-for: 迭代 sdgs 陣列，:key 幫 Vue 追蹤每個元素，:sdg 是把整個 sdg 物件傳給子元件 -->
      <SdgsCard v-for="sdg in sdgs" :key="sdg.id" :sdg="sdg" />
    </div>
  </section>
</template>

<style scoped>
.page-shell {
  display: grid;
  gap: 20px;
}

.page-header h2 {
  margin: 8px 0 12px;
  font-size: 2rem;
}

.page-header p {
  margin: 0;
  color: #5f667b;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.8rem;
  color: #2a7d65;
}

.card-grid {
  display: grid;
  /* 把每張卡牌的最小寬度拉大，讓較長的中英文標題有更多空間可以顯示。 */
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 22px;
}

.status-text {
  margin: 0;
}

.error {
  color: #b24c3d;
}
</style>
