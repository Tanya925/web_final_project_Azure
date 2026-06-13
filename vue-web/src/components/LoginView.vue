<!--
檔案說明：LoginView.vue - 提供登入與註冊表單，負責傳送帳密到後端並在登入成功後透過事件告知父元件。
-->


<script setup>
import { reactive, ref } from 'vue'  // Vue 3 的 Composition API，reactive 用來定義響應式物件(會變動的資料)，ref 用來定義響應式基本類型資料。
import { api } from '../api'  // 用共用 API 設定統一管理部署網址，避免 Azure 上還寫死 localhost。

const emit = defineEmits(['login-success'])  // 定義一個事件，讓這個元件在登入成功後，可以通知父元件 App.vue 來更新使用者資料，確保畫面上顯示的使用者資訊是最新的。

const form = reactive({
  username: '',
  password: '',
})

const error = ref('')
const success = ref('')
const loading = ref(false)
const isRegister = ref(false)

const registerForm = reactive({
  username: '',
  password: '',
})

// 登入成功後，把使用者資料交給 App.vue 管理。
async function login() {
  error.value = ''
  success.value = ''
  loading.value = true

  // 把帳密傳給後端 API，讓後端驗證並建立 session。登入成功後會得到使用者資料，透過事件告訴父元件更新使用者狀態。
  try {
    const res = await api.post('/users/login', form)
    emit('login-success', res.data)
  } catch (err) {
    error.value = err.response?.data?.message || '登入失敗'
  }

  loading.value = false
}

// 註冊成功後不直接登入，而是提示使用者回登入表單重新登入。
async function register() {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const res = await api.post('/users/register', registerForm)
    success.value = res.data.message
    registerForm.username = ''
    registerForm.password = ''
    isRegister.value = false
  } catch (err) {
    error.value = err.response?.data?.message || '註冊失敗'
  }

  loading.value = false
}
</script>

<template>
  <section class="login-shell">
    <div class="login-card">
      <p class="eyebrow">Login First</p>
      <h1>登入後開始你的校園永續挑戰</h1>
      <p class="intro">
        先登入帳號，系統才會顯示你的任務進度、個人積分與社群互動內容。
      </p>

      <!-- 切換登入 / 註冊：使用條件切換 (v-if / v-else)，按鈕用 :class 根據 isRegister 決定哪個為活躍狀態 -->
      <div class="toggle-row">
        <button :class="['tab', !isRegister ? 'active' : '']" @click.prevent="isRegister = false">登入</button>
        <button :class="['tab', isRegister ? 'active' : '']" @click.prevent="isRegister = true">註冊</button>
      </div>

      <!-- v-if 判斷是否顯示登入表單；@submit.prevent 防止表單重新整理並呼叫對應函式 -->
      <form v-if="!isRegister" class="login-form" @submit.prevent="login">
        <!-- v-model 雙向綁定輸入值到 reactive 的 form 物件 -->
        <input v-model="form.username" type="text" placeholder="帳號" />
        <input v-model="form.password" type="password" placeholder="密碼" />
        <!-- :disabled 綁定按鈕是否可點擊；{{ }} 顯示動態文字 -->
        <button class="login-button" :disabled="loading">{{ loading ? '登入中...' : '登入' }}</button>
      </form>

      <form v-else class="login-form" @submit.prevent="register">
        <input v-model="registerForm.username" type="text" placeholder="帳號" />
        <input v-model="registerForm.password" type="password" placeholder="密碼" />
        <button class="login-button" :disabled="loading">{{ loading ? '註冊中...' : '註冊' }}</button>
      </form>

      <p v-if="success" class="success-text">{{ success }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </section>
</template>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.login-card {
  width: min(480px, 100%);
  padding: 32px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(34, 73, 64, 0.12);
  box-shadow: 0 24px 50px rgba(33, 56, 74, 0.12);
}

.toggle-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.tab {
  flex: 1;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: #f3f7f4;
  cursor: pointer;
}

.tab.active {
  /* 登入頁的作用中頁籤改成指定的純綠色。 */
  background: #4b8a73;
  background-image: none;
  color: #fff;
  border-color: rgba(0,0,0,0.06);
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
  line-height: 1.2;
  font-size: clamp(1.9rem, 3vw, 2.6rem);
  white-space: nowrap;
}

.intro,
.hint {
  margin: 0;
  color: #636980;
  line-height: 1.7;
}

.login-form {
  display: grid;
  gap: 12px;
  margin: 22px 0 16px;
}

input {
  width: 100%;
  border: 1px solid #c8d3ce;
  border-radius: 16px;
  padding: 13px 14px;
  font: inherit;
}

.login-button {
  /* 最下方最長的送出按鈕改成較深的純綠色。 */
  border: 0;
  border-radius: 16px;
  padding: 13px 14px;
  background: #2f6b57;
  background-image: none;
  color: white;
  font: inherit;
  cursor: pointer;
}

.login-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.error-text {
  margin-top: 14px;
  color: #b24c3d;
}

.success-text {
  margin-top: 14px;
  color: #246b4d;
}

@media (max-width: 560px) {
  h1 {
    white-space: normal;
  }
}
</style>
