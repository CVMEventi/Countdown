<template>
  <div v-if="dataUrl" class="bg-white p-2 rounded-lg inline-block">
    <img :src="dataUrl" :alt="text" class="block w-full h-auto" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{
  text: string
}>()

const dataUrl = ref('')
// Rendering is async, so a slow earlier render could otherwise land after a newer one when the
// user flicks through the address picker
let latestRender = 0

watch(() => props.text, async (text) => {
  const render = ++latestRender

  if (!text) {
    dataUrl.value = ''
    return
  }

  try {
    // Rendered large and displayed small so it stays crisp on high density screens. The explicit
    // white keeps the quiet zone light against the dark UI, which is what phones need to lock on
    const rendered = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
      color: { dark: '#000000ff', light: '#ffffffff' },
    })
    if (render === latestRender) dataUrl.value = rendered
  } catch {
    if (render === latestRender) dataUrl.value = ''
  }
}, { immediate: true })
</script>
