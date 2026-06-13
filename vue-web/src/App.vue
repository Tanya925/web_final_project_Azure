<!--
檔案說明：App.vue - 應用主控制器，負責頁面切換、維護登入使用者狀態，以及整個應用的主要佈局（header/nav/main）。
-->


<script setup>
import { ref, onMounted } from 'vue'
import { api } from './api'

// 匯入各個功能頁面的元件，這些元件會在 main 區域根據使用者選擇的分頁來切換顯示。
import ChallengeView from './components/ChallengeView.vue'
import CommunityView from './components/CommunityView.vue'
import LoginView from './components/LoginView.vue'
import QuizView from './components/QuizView.vue'
import SdgsView from './components/SdgsView.vue'

// 用一份設定集中管理目前網站有哪些功能頁面。
const pages = [
  { key: 'sdgs', label: 'SDGs 介紹', component: SdgsView },
  { key: 'challenges', label: '永續挑戰', component: ChallengeView },
  { key: 'quiz', label: '測驗遊戲', component: QuizView },
  { key: 'community', label: '社群互動牆', component: CommunityView },
]

// activePage: 控制目前首頁主內容要顯示哪一頁。
const activePage = ref('sdgs')
// currentUser: 記住現在登入的是誰，並把積分等資料傳給各頁使用。
const currentUser = ref(null)

// 重新整理頁面時，向後端確認 session 是否還在。
onMounted(async () => {
  try {
    // 這裡改用共用 api 設定，部署到 Azure 後就不會再硬連回本機 localhost。
    const res = await api.get('/users/me')
    currentUser.value = res.data
  } catch (e) {
    currentUser.value = null
  }
})

// 依照目前選到的分頁，回傳要顯示的元件。
function getCurrentComponent() {
  for (let i = 0; i < pages.length; i += 1) {
    if (pages[i].key === activePage.value) {
      return pages[i].component
    }
  }

  return SdgsView
}

// 子元件登入成功或更新積分後，統一從這裡更新 App 的使用者狀態。
function handleLoginSuccess(user) {
  currentUser.value = user
}

// 登出時同步通知後端清掉 session。
async function logout() {
  await api.post('/users/logout', {})
  currentUser.value = null
  activePage.value = 'sdgs'
}
</script>

<template>
  <!-- 當沒有登入使用者時，顯示登入元件；元件成功登入後會透過 `login-success` 事件回傳使用者資料 -->
  <LoginView v-if="!currentUser" @login-success="handleLoginSuccess" />

  <!-- 當已登入 (`v-else`)，顯示主畫面（header + nav + main） -->
  <div v-else class="app-shell">
    <header class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Campus SDGs Learning Platform</p>
        <h1>校園 SDGs 互動學習平台</h1>
        <p class="hero-text">
          結合 SDGs 翻牌介紹、微任務挑戰、知識測驗與社群分享，讓永續學習變成可以參與、完成與累積的校園體驗。
        </p>
      </div>
      <div class="user-box">
        <!-- 這裡使用 Mustache 插值 ({{ }}) 顯示 reactive 的 `currentUser` 資料 -->
        <span class="user-label">個人資訊</span>
        <strong>Hi {{ currentUser.username }}</strong>
        <small>積分 {{ currentUser.points }}</small>
        <!-- @click 是事件綁定，點按會呼叫 component 中的 `logout` 方法 -->
        <button class="logout-button" @click="logout">登出</button>
      </div>
    </header>

    <nav class="tab-nav">
      <!-- 這裡使用 v-for 迭代 `pages` 陣列產生多個按鈕 -->
      <!-- :key 幫 Vue 跟蹤每個項目的 identity，避免重繪問題 -->
      <!-- :class 會依條件套用 CSS class；@click 指定點擊時要做的動作 -->
      <button
        v-for="page in pages"
        :key="page.key"
        class="tab-button"
        :class="{ active: activePage === page.key }"
        @click="activePage = page.key"
      >
        {{ page.label }}
      </button>
    </nav>

    <main class="content-shell">
      <!-- 使用動態元件：:is 接受一個元件（或元件名稱），這裡透過 getCurrentComponent() 決定要顯示哪個頁面 -->
      <!-- 將 `currentUser` 當作 prop 傳入子元件，並監聽子元件的 `user-updated` 事件 -->
      <component :is="getCurrentComponent()" :current-user="currentUser" @user-updated="handleLoginSuccess" />
    </main>
  </div>
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family: "Segoe UI", "Noto Sans TC", sans-serif;
  background:
    radial-gradient(circle at top left, rgba(173, 167, 193, 0.3), transparent 28%),
    radial-gradient(circle at top right, rgba(145, 137, 168, 0.32), transparent 24%),
    radial-gradient(circle at bottom left, rgba(188, 182, 206, 0.24), transparent 26%),
    linear-gradient(180deg, #f3f0f8 0%, #efebf5 40%, #e8e2f1 100%);
  color: #17342d;
}

:global(*) {
  box-sizing: border-box;
}

.app-shell {
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 52px;
}

.hero,
.content-shell {
  border-radius: 30px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(241, 238, 247, 0.9));
  border: 1px solid rgba(111, 109, 136, 0.18);
  box-shadow: 0 20px 45px rgba(76, 79, 107, 0.12);
  backdrop-filter: blur(8px);
}

.hero {
  padding: 34px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.8rem;
  color: #2a7d65;
}

h1 {
  margin: 10px 0 14px;
  font-size: clamp(2.2rem, 4vw, 4rem);
}

.hero-text {
  margin: 0;
  max-width: 70ch;
  line-height: 1.8;
  color: #61657d;
}

.hero-copy {
  flex: 1;
}

.user-box {
  /* 個人資訊卡改成比較輕的玻璃卡片，避免右上角像硬放了一大塊色塊。 */
  min-width: 240px;
  padding: 20px 20px 18px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(239, 235, 245, 0.92));
  background-image: none;
  color: #40506a;
  display: grid;
  gap: 8px;
  border: 1px solid rgba(132, 124, 156, 0.22);
  box-shadow: 0 18px 36px rgba(101, 97, 124, 0.14);
  align-self: flex-start;
}

.user-label {
  /* 補上一個小標籤，讓這塊區域更像精緻的資訊卡。 */
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #7e7797;
}

.user-box strong {
  /* 使用者名稱保留存在感，但不要大到壓過左邊主標題。 */
  font-size: 1.7rem;
  line-height: 1.1;
  letter-spacing: 0.01em;
  color: #21483d;
}

.user-box small {
  /* 積分文字改成較柔和的灰紫色，和整體配色一致。 */
  font-size: 1rem;
  color: #6a7086;
}

.logout-button {
  /* 登出按鈕保留純綠色，但縮得更像資訊卡裡的功能按鈕。 */
  margin-top: 4px;
  border: 0;
  border-radius: 18px;
  padding: 11px 16px;
  background: #6f947f;
  background-image: none;
  color: white;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(111, 148, 127, 0.2);
}

.tab-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 22px 0;
}

.tab-button {
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  background: linear-gradient(135deg, #edf4ef, #ece8f2);
  color: #4b5268;
  font: inherit;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(111, 109, 136, 0.12);
}

.tab-button.active {
  background: linear-gradient(135deg, #6f6888, #847c9c 72%, #9b93b0);
  color: white;
}

.content-shell {
  padding: 28px;
}

@media (max-width: 768px) {
  .app-shell {
    width: min(100% - 20px, 1200px);
    padding-top: 20px;
  }

  .hero,
  .content-shell {
    padding: 22px;
  }

  .hero {
    flex-direction: column;
  }

  .user-box {
    width: 100%;
    min-width: 0;
  }
}
</style>
