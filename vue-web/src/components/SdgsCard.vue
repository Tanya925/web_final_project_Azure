<!--
檔案說明：SdgsCard.vue - 單一 SDG 卡牌元件，負責顯示編號、標題與說明，並處理卡牌的翻轉互動（點擊翻面）。
-->


<script setup>
import { ref } from 'vue'  // 匯入 ref 函式來萊娣應會變動的資料(因為這個元件需要記錄：目前是正面還是背面)

// 代表父元件會傳進來：sdg。例如
// 例如：
// {
//   number: 12,
//   title: "責任消費與生產",
//   englishTitle: "Responsible Consumption and Production",
//   description: "減少浪費..."
// }

// 為什麼要 defineProps？因為：17張卡牌內容都不一樣，所以卡牌元件要能接收不同 SDG 資料
defineProps({
  sdg: {
    type: Object,
    required: true,
  },
})

const isFlipped = ref(false)  // 用來記錄目前卡牌是正面還是背面，初始為 false（代表正面）。當使用者點擊卡牌時，會切換這個值，讓卡牌翻轉。


// 切換卡牌正反面。
function flipCard() {
  isFlipped.value = !isFlipped.value
}
</script>

<template>
  <button class="card-shell" :class="{ flipped: isFlipped }" @click="flipCard">
    <div class="card-face front">
      <div class="card-top">
        <span class="number-badge">SDG {{ sdg.number }}</span>
        <span class="mini-text">Click to flip</span>
      </div>
      <div class="card-main">
        <!-- 現在資料庫的 title 直接存中英文合併內容，所以正面只要顯示 title 就好。 -->
        <h3>{{ sdg.title }}</h3>
      </div>
      <p class="card-tip">點擊卡牌查看詳細介紹</p>
    </div>

    <div class="card-face back">
      <span class="label">Goal Introduction</span>
      <!-- 背面同樣直接顯示合併後的 title。 -->
      <h3>{{ sdg.title }}</h3>
      <p>{{ sdg.description }}</p>
    </div>
  </button>
</template>

<style scoped>
.card-shell {
  position: relative;
  /* 卡牌高度一起放大，避免標題過長時內容擠在一起。 */
  min-height: 420px;
  border: 0;
  background: transparent;
  cursor: pointer;
  perspective: 1000px;
}

.card-face {
  position: absolute;
  inset: 0;
  padding: 28px;
  border-radius: 28px;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.7s ease;
  box-shadow: 0 22px 40px rgba(40, 48, 66, 0.14);
}

.front {
  background:
    radial-gradient(circle at top right, rgba(205, 196, 226, 0.45), transparent 26%),
    radial-gradient(circle at bottom left, rgba(150, 141, 175, 0.26), transparent 28%),
    linear-gradient(155deg, #2a7d65, #174f46 54%, #6f6888 82%, #9088a6 100%);
  color: #fff;
  overflow: hidden;
}

.back {
  background:
    linear-gradient(180deg, rgba(235, 243, 239, 0.98), rgba(236, 232, 242, 0.98));
  color: #17342d;
  border: 1px solid rgba(123, 117, 146, 0.24);
  transform: rotateY(180deg);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.card-main {
  display: grid;
  gap: 14px;
}

.number-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(240, 234, 249, 0.18);
  border: 1px solid rgba(229, 223, 242, 0.26);
  font-size: 0.86rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mini-text,
.label {
  font-size: 0.84rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.78;
}

h3 {
  margin: 0;
  font-size: 2rem;
  /* 讓資料庫裡 title 的換行可以直接顯示成中文一行、英文一行。 */
  white-space: pre-line;
  line-height: 1.5;
}

p {
  margin: 0;
  line-height: 1.7;
}

.card-tip {
  opacity: 0.88;
}

.flipped .front {
  transform: rotateY(180deg);
}

.flipped .back {
  transform: rotateY(360deg);
}
</style>
