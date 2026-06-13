<!--
檔案說明：ChallengeView.vue - 顯示使用者可完成的微任務，管理完成動作、重置任務與顯示進度摘要。
-->

<script setup>
import { nextTick, onMounted, ref } from 'vue'  // Vue 3 的 Composition API，onMounted 是一個生命週期函式，ref 用來定義響應式資料(會變動的資料)，nextTick 用來在資料更新後等待畫面重新渲染。
import { api } from '../api'  // 共用 API 設定，讓本機與 Azure 都走同一套呼叫方式。

// 代表目前登入的使用者資料，從父元件 App.vue 傳進來，包含 userId、username、currentPoints 等欄位。
const props = defineProps({
  currentUser: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['user-updated'])  // 定義一個事件，讓這個元件在需要更新使用者資料時，可以通知父元件 App.vue 來重新抓取最新的使用者資料，確保畫面上顯示的積分等資訊是最新的。

// loading: 控制任務清單載入中的畫面狀態。
const loading = ref(true)
// error: 顯示讀取失敗、完成任務失敗或重置失敗訊息。
const error = ref('')
// submittingId: 記錄目前哪一筆任務正在送出，避免重複點擊。
const submittingId = ref(null)
// groupedChallenges: 把原始任務整理成 SDG 區塊後，提供 template 顯示。
const groupedChallenges = ref([])
// bonusMessage: 全部完成或重置後，在畫面上顯示提示文字。
const bonusMessage = ref('')
// listRenderKey: 強制重新渲染任務清單，確保重置後畫面立刻更新。
const listRenderKey = ref(0)
// summary: 儲存任務總數、完成數與額外獎勵積分等摘要資料。
const summary = ref({
  totalCount: 0,
  completedCount: 0,
  allCompleted: false,
  bonusPoints: 50,
})

// 把同一個 SDG 的任務整理成一組，前端比較好做區塊式顯示。
function groupChallengeList(list) {
  const groups = []

  for (let i = 0; i < list.length; i += 1) {
    const item = list[i]
    const lastGroup = groups[groups.length - 1]

    if (!lastGroup || lastGroup.sdgId !== item.sdg_id) {
      groups.push({
        sdgId: item.sdg_id,
        sdgTitle: item.sdg_title,
        items: [item],
      })
    } else {
      lastGroup.items.push(item)
    }
  }

  return groups
}

// 把後端回傳的任務資料套用到畫面上，並更新摘要資訊。
function applyChallengeData(data) {
  groupedChallenges.value = groupChallengeList(data.items)
  summary.value = data.summary
}

// 重新抓取目前使用者的挑戰資料與最新積分。
async function fetchChallenges() {
    // 利用 listRenderKey 強制重繪整個列表
    listRenderKey.value += 1
  const [challengeRes, userRes] = await Promise.all([
    api.get('/api/challenges'),
    api.get('/users/me'),
  ])

  applyChallengeData(challengeRes.data)  // 把任務資料套用到畫面上
  listRenderKey.value += 1  // 確保任務列表重新渲染，反映最新的完成狀態
  emit('user-updated', userRes.data)  // 通知父元件更新使用者資料，確保積分等資訊是最新的
}

// 完成單一任務後重新同步資料，必要時顯示可重置提示。
async function completeChallenge(challengeId) {
  submittingId.value = challengeId
  error.value = ''
  bonusMessage.value = ''

  try {
    const res = await api.post('/api/challenges/complete', { challengeId })

    if (res.data.canReset) {
      bonusMessage.value = `你已完成全部任務，現在可以領取 ${summary.value.bonusPoints} 分額外積分並刷新任務。`
    }

    await fetchChallenges()

  } catch (err) {
    error.value = err.response?.data?.message || '完成任務失敗'
  }

  submittingId.value = null
}

// 重新載入任務資料，通常用在元件第一次載入或重置任務後。
async function loadChallenges() {
  try {
    await fetchChallenges()
  } catch (err) {
    error.value = '無法載入挑戰資料'
  }

  loading.value = false
}

// 全部完成後領取 bonus，並立即把重置後的新任務畫面套回來。
async function resetChallenges() {
  error.value = ''
  bonusMessage.value = ''

  try {
    const res = await api.post('/api/challenges/reset', {})

    bonusMessage.value = `全部任務完成，額外獲得 ${res.data.bonusAwarded} 分，任務已重新刷新。`
    emit('user-updated', res.data.user)
    applyChallengeData({
      items: res.data.items,
      summary: res.data.summary,
    })
    listRenderKey.value += 1
    await nextTick()
  } catch (err) {
    error.value = err.response?.data?.message || '任務重置失敗'
  }
}

// 元件第一次載入時要執行的東西，自動把目前登入者的任務資料抓回來。
onMounted(() => {
  loadChallenges()
})
</script>

<template>
  <section class="page-shell">
    <div class="page-header">
      <div>
        <p class="eyebrow">永續挑戰</p>
        <h2>完成微任務，累積校園永續積分</h2>
      </div>
    </div>

    <div class="summary-bar">
      <!-- summary-bar 顯示進度與重置按鈕，:disabled 綁定是否可按下 -->
      <span>完成進度 {{ summary.completedCount }} / {{ summary.totalCount }}</span>
      <button class="reset-button" :disabled="!summary.allCompleted" @click="resetChallenges">
        領取 {{ summary.bonusPoints }} 分並重置任務
      </button>
    </div>

    <p v-if="loading" class="status-text">載入中...</p>
    <p v-else-if="error" class="status-text error">{{ error }}</p>
    <p v-if="bonusMessage" class="status-text success">{{ bonusMessage }}</p>

    <div :key="listRenderKey" v-else class="challenge-groups">
      <article v-for="group in groupedChallenges" :key="group.sdgId" class="group-card">
        <h3>SDG {{ group.sdgId }} {{ group.sdgTitle }}</h3>
        <div class="challenge-list">
          <div v-for="challenge in group.items" :key="challenge.id" class="challenge-item">
            <div>
              <p class="challenge-title">
                {{ challenge.completed ? '☑' : '☐' }} {{ challenge.title }}
              </p>
              <span>積分 {{ challenge.points }}</span>
            </div>
            <button
              class="action-button"
              :disabled="challenge.completed || submittingId === challenge.id"
              @click="completeChallenge(challenge.id)"
            >
              {{ challenge.completed ? '已完成' : '完成任務' }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.page-shell {
  display: grid;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.page-header h2 {
  margin: 8px 0 0;
  font-size: 2rem;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.8rem;
  color: #2a7d65;
}

.challenge-groups {
  display: grid;
  gap: 16px;
}

.summary-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(241, 237, 247, 0.96), rgba(232, 226, 241, 0.96));
  border: 1px solid rgba(123, 117, 146, 0.16);
}

.group-card {
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, #f7fbf8, #eeeaf4);
  border: 1px solid rgba(123, 117, 146, 0.14);
}

.group-card h3 {
  margin: 0 0 14px;
}

.challenge-list {
  display: grid;
  gap: 12px;
}

.challenge-item {
  padding: 16px;
  border-radius: 18px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.challenge-title {
  margin: 0 0 6px;
  font-weight: 700;
}

span {
  color: #666b7f;
}

.action-button {
  border: 0;
  border-radius: 14px;
  padding: 11px 14px;
  background: #2a7d65;
  color: white;
  cursor: pointer;
}

.reset-button {
  border: 0;
  border-radius: 14px;
  padding: 11px 14px;
  background: linear-gradient(135deg, #6f6888, #938aa8);
  color: white;
  font: inherit;
  cursor: pointer;
}

.reset-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-text {
  margin: 0;
}

.error {
  color: #b24c3d;
}

.success {
  color: #246b4d;
}

@media (max-width: 780px) {
  .page-header,
  .challenge-item,
  .summary-bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
