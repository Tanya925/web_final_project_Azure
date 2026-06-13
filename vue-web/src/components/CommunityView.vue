<!--
檔案說明：CommunityView.vue - 社群牆，顯示貼文列表並提供發文上傳功能（包含圖片預覽與上傳）。
-->


<script setup>
import { onMounted, reactive, ref } from 'vue'  // Vue 3 的 Composition API，onMounted 是一個生命週期函式，reactive 用來定義響應式物件(會變動的資料)，ref 用來定義響應式基本類型資料。
import { api, buildAssetUrl } from '../api'  // API 與圖片網址都集中走同一份部署設定，避免 Azure 上還拼回 localhost。

// currentUser 目前主要是讓這個元件知道：社群貼文是誰在登入狀態下操作。
const props = defineProps({
  currentUser: {
    type: Object,
    required: true,
  },
})

// posts: 畫面上方的社群貼文清單資料。
const posts = ref([])
// loading: 控制貼文列表載入中的狀態文字。
const loading = ref(true)
// error: 顯示發文失敗、載入失敗或圖片讀取失敗等訊息。
const error = ref('')
// form: 目前發文表單只需要記錄文字內容。
const form = reactive({
  content: '',
})

// 使用者選擇本機圖片後，前端先顯示預覽圖。
const previewImage = ref('')
// 保留原始檔案，等送出時再包成 FormData 上傳到後端。
const selectedImageFile = ref(null)

// 讀取目前社群牆所有貼文。
async function fetchPosts() {
  const res = await api.get('/api/posts')  // 從後端 API 取得貼文資料，預期會得到一個陣列，每個元素包含貼文內容、圖片路徑、作者名稱、建立時間等欄位。
  posts.value = res.data
}

// 把本機圖片轉成預覽圖，讓使用者在送出前先確認。
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = function handleLoad() {
      resolve(reader.result)
    }

    reader.onerror = function handleError() {
      reject(new Error('圖片讀取失敗'))
    }

    reader.readAsDataURL(file)
  })
}

// 選圖後先保留原始檔案，送出時再用 FormData 上傳。
async function handleImageUpload(event) {
  const file = event.target.files[0]

  if (!file) {
    return
  }

  try {
    const imageData = await readFileAsDataUrl(file)
    selectedImageFile.value = file
    previewImage.value = imageData
  } catch (err) {
    error.value = '無法讀取圖片'
  }
}

// 新增一篇貼文，成功後馬上重新抓列表。
async function submitPost() {
  error.value = ''
  // FormData 讓我們可以同時傳送文字與圖片檔案給後端。
  const formData = new FormData()
  formData.append('content', form.content)

  if (selectedImageFile.value) {
    formData.append('image', selectedImageFile.value)
  }

  try {
    await api.post('/api/posts', formData)

    form.content = ''
    previewImage.value = ''
    selectedImageFile.value = null
    await fetchPosts()
  } catch (err) {
    error.value = err.response?.data?.message || '發布貼文失敗'
  }
}

// 把資料庫的建立時間轉成台灣常見的月/日 + 時間格式，讓貼文牆更容易閱讀。
function formatDate(value) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

// 如果後端存的是 /uploads/... 這種路徑，前端要補上後端主機位置才能正確顯示。
function getImageUrl(imagePath) {
  return buildAssetUrl(imagePath)
}


// 元件一載入就先抓目前所有貼文，讓使用者先看到動態牆內容。
onMounted(async () => {
  try {
    await fetchPosts()
  } catch (err) {
    error.value = '無法載入社群貼文'
  }

  loading.value = false
})
</script>

<template>
  <section class="page-shell">
    <div class="page-header">
      <p class="eyebrow">社群互動牆</p>
      <h2>看看大家最近做了哪些永續實踐</h2>
      <p>把你在校園中做到的永續行動變成照片日記，也看看其他人的實踐靈感。</p>
    </div>

    <!-- 上半部先顯示所有人的貼文，讓社群牆更像動態流。 -->
    <div class="post-wall-section">
      <div class="wall-header">
        <p class="panel-tag">Community Feed</p>
        <h3>看看大家最近做了哪些永續實踐</h3>
      </div>

        <div class="post-grid">
          <!-- v-if 顯示載入狀態；v-else 或 v-for 顯示內容 -->
          <p v-if="loading" class="status-text">載入中...</p>

          <!-- v-for 迭代 posts，:key 幫 Vue 追蹤每個項目 -->
          <article v-for="post in posts" v-else :key="post.id" class="post-card">
            <!-- :src 為綁定屬性，用函式處理相對路徑或 data URL -->
            <img :src="getImageUrl(post.image)" :alt="post.content" class="post-image" />
            <div class="post-body">
              <div class="post-meta">
                <strong>{{ post.username }}</strong>
                <span>{{ formatDate(post.created_at) }}</span>
              </div>
              <p>{{ post.content }}</p>
            </div>
          </article>
        </div>
    </div>

    <!-- 下半部才放發文輸入區，符合你要的版面順序。 -->
    <!-- 發文表單：@submit.prevent 阻止預設提交並呼叫 submitPost -->
    <form class="post-form" @submit.prevent="submitPost">
      <p class="panel-tag">Share your action</p>
      <h3>發布你的永續瞬間</h3>
      <!-- v-model 雙向綁定表單內容 -->
      <textarea v-model="form.content" rows="5" placeholder="分享今天做了什麼永續行動"></textarea>
      <!-- 現在可以直接選擇本機照片，不用再手動貼網址。 -->
      <label class="upload-field">
        <span>選擇照片上傳</span>
        <!-- @change 檔案輸入變動時呼叫 handleImageUpload 取得預覽 -->
        <input type="file" accept="image/*" @change="handleImageUpload" />
      </label>
      <!-- v-if 條件顯示圖片預覽 -->
      <img v-if="previewImage" :src="previewImage" alt="預覽圖片" class="preview-image" />
      <button class="primary-button">發布貼文</button>
      <p v-if="error" class="status-text error">{{ error }}</p>
    </form>
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

.post-wall-section,
.post-form,
.post-card {
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 237, 246, 0.96));
  border: 1px solid rgba(123, 117, 146, 0.14);
  box-shadow: 0 16px 30px rgba(76, 79, 107, 0.09);
}

.post-wall-section {
  padding: 22px;
  display: grid;
  gap: 18px;
}

.post-form {
  padding: 22px;
  display: grid;
  gap: 14px;
  align-content: start;
  margin-top: 20px;
}

.panel-tag {
  margin: 0;
  color: #2a7d65;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.78rem;
}

.post-form h3 {
  margin: 0;
  font-size: 1.7rem;
}

.wall-header h3 {
  margin: 8px 0 0;
  font-size: 1.45rem;
}

textarea,
input {
  width: 100%;
  border: 1px solid #c6d6cf;
  border-radius: 16px;
  padding: 12px 14px;
  font: inherit;
}

.upload-field {
  display: grid;
  gap: 8px;
  color: #5f667b;
}

.upload-field input {
  background: white;
}

.preview-image {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 18px;
  border: 1px solid rgba(123, 117, 146, 0.14);
  background: #f7f9f8;
}

.primary-button {
  border: 0;
  border-radius: 14px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #6f6888, #847c9c 72%, #9b93b0);
  color: white;
  font: inherit;
  cursor: pointer;
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}

.post-card {
  overflow: hidden;
  display: grid;
}

.post-image {
  width: 100%;
  height: 250px;
  object-fit: contain;
  background: #f7f9f8;
}

.post-body {
  padding: 18px;
  display: grid;
  gap: 10px;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.post-body p,
.post-meta span {
  margin: 0;
  color: #666b7f;
  line-height: 1.7;
}

.status-text {
  margin: 0;
}

.error {
  color: #b24c3d;
}

@media (max-width: 860px) {
  .post-wall-section,
  .post-form {
    padding: 18px;
  }
}
</style>
