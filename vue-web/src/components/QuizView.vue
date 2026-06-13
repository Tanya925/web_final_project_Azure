<!--
檔案說明：QuizView.vue - 顯示隨機抽題的測驗介面，管理作答、送出與結果顯示，並同步更新使用者積分。
-->


<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api'

const props = defineProps({
  currentUser: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['user-updated'])
// questions: 後端隨機抽出的題目列表。
const questions = ref([])
// selectedAnswers: 記錄每一題目前選到哪個答案。
const selectedAnswers = ref({})
// result: 送出後顯示答對題數與獲得積分。
const result = ref(null)
// loading: 控制測驗載入或重抽時的等待狀態。
const loading = ref(true)
// error: 顯示測驗讀取或送出失敗的訊息。
const error = ref('')
// choiceLabels: 讓 A/B/C/D 的選項渲染可以用同一份迴圈完成。
const choiceLabels = ['A', 'B', 'C', 'D']

// 作答或重抽之後，重新同步目前登入者的積分。
async function fetchUser() {
  const res = await api.get('/users/me')
  emit('user-updated', res.data)
}

// 抓一組新的隨機題目。
async function fetchQuiz() {
  const res = await api.get('/api/quiz/random')
  questions.value = res.data
  selectedAnswers.value = {}
  result.value = null
}

// 使用者選擇某題的某個選項時，記錄下來。
function selectAnswer(questionId, answer) {
  selectedAnswers.value[questionId] = answer
}

// 把 5 題答案一次送去後端批改。
async function submitQuiz() {
  try {
    const answers = questions.value.map((question) => ({
      id: question.id,
      answer: selectedAnswers.value[question.id] || '',
    }))

    const res = await api.post('/api/quiz/submit', { answers })

    result.value = res.data
    await fetchUser()
  } catch (err) {
    error.value = '測驗送出失敗'
  }
}

// 重新抽新題，並清掉上一輪結果。
async function restartQuiz() {
  loading.value = true
  error.value = ''

  try {
    await fetchQuiz()
  } catch (err) {
    error.value = '無法重新載入測驗'
  } finally {
    loading.value = false
  }
}

// 元件第一次載入時要執行的東西，自動把目前登入者的測驗題目抓回來。
onMounted(async () => {
  try {
    await Promise.all([fetchQuiz(), fetchUser()])
  } catch (err) {
    error.value = '無法載入測驗資料'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="page-shell">
    <div class="page-header">
      <div>
        <p class="eyebrow">測驗遊戲</p>
        <h2>隨機抽 5 題，測試你對 SDGs 的理解</h2>
      </div>
      <div class="score-badge">目前積分 {{ currentUser.points }}</div>
    </div>

    <p v-if="loading" class="status-text">載入中...</p>
    <p v-else-if="error" class="status-text error">{{ error }}</p>

    <!-- v-else: 非 loading 且沒有錯誤時顯示題目清單 -->
    <div v-else class="quiz-grid">
      <article v-for="(question, index) in questions" :key="question.id" class="quiz-card">
        <p class="question-index">第 {{ index + 1 }} 題</p>
        <h3>{{ question.question }}</h3>

        <div class="option-list">
          <button
            v-for="label in choiceLabels"
            :key="label"
            class="option-button"
            :class="{ selected: selectedAnswers[question.id] === label }"
            @click="selectAnswer(question.id, label)"
          >
            <!-- {{ }} 是插值，會把 reactive 資料渲染到畫面上 -->
            <!-- :class 依條件套用 class，@click 代表點擊事件綁定 -->
            {{ label }}. {{ question[`option${label}`] }}
          </button>
        </div>
      </article>
    </div>

    <!-- 按鈕：如果 loading 為 false，顯示送出與重新抽題的控制項 -->
    <div v-if="!loading" class="quiz-actions">
      <button class="primary-button" @click="submitQuiz">送出本輪答案</button>
      <button class="secondary-button" @click="restartQuiz">重新抽題</button>
    </div>

    <div v-if="result" class="result-card">
      <h3>測驗結果</h3>
      <p>答對 {{ result.correctCount }} / {{ result.total }} 題</p>
      <p>獲得積分 {{ result.awardedPoints }}</p>
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
  align-items: center;
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

.score-badge {
  padding: 12px 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ece8f4, #e2deec);
  color: #4d4f6b;
  font-weight: 700;
}

.quiz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.quiz-card,
.result-card {
  padding: 20px;
  border-radius: 22px;
  background: linear-gradient(180deg, white, #f1edf6);
  border: 1px solid rgba(123, 117, 146, 0.14);
  box-shadow: 0 16px 30px rgba(76, 79, 107, 0.09);
}

.question-index {
  margin: 0 0 10px;
  color: #607971;
}

.quiz-card h3 {
  margin: 0 0 14px;
  line-height: 1.5;
}

.option-list {
  display: grid;
  gap: 10px;
}

.option-button,
.primary-button,
.secondary-button {
  border: 0;
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit;
  cursor: pointer;
}

.option-button {
  text-align: left;
  background: #f4f9f6;
  color: #1d3732;
}

.option-button.selected {
  background: #e4f0ea;
  outline: 2px solid #2a7d65;
}

.quiz-actions {
  display: flex;
  gap: 12px;
}

.primary-button {
  background: #2a7d65;
  color: white;
}

.secondary-button {
  background: linear-gradient(135deg, #e9e4f2, #dcd5e8);
  color: #4d4f6b;
}

.status-text {
  margin: 0;
}

.error {
  color: #b24c3d;
}

@media (max-width: 780px) {
  .page-header,
  .quiz-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
