<template>
  <div class="flex flex-row items-center mt-1">
    <Popover v-slot="{ open }">
      <Float
        placement="left"
        :shift="10"
        enter="transition duration-200 ease-out"
        enter-from="scale-95 opacity-0"
        enter-to="scale-100 opacity-100"
        leave="transition duration-150 ease-in"
        leave-from="scale-100 opacity-100"
        leave-to="scale-95 opacity-0"
        :arrow="5" :offset="15">
        <PopoverButton class="flex flex-row items-center focus:outline-0">
          <div
            class="w-5 h-5 inline-block border border-gray-300 rounded"
            :style="{backgroundColor: modelValue}"
          ></div>
          <button class="text-base ml-1">
            <slot></slot>
          </button>
        </PopoverButton>
        <PopoverPanel class="shadow-xl">
          <FloatArrow class="absolute bg-white w-5 h-5 rotate-45 border border-gray-200" />
          <div class="relative h-full bg-white p-1 rounded-md border border-gray-200">
            <color-picker default-format="rgb" :alpha-channel="stringAlphaChannel" :color="modelValue" @color-change="updateColor">
              <slot name="copy-button">
                <document-duplicate-icon class="w-5 h-5" />
              </slot>
            </color-picker>
          </div>
        </PopoverPanel>
      </Float>
    </Popover>

    <!--<input
      class="min-h-color"
      :value="modelValue"
      type="color"
      placeholder="#000000"
      @input="$emit('update:modelValue', $event.target.value)"
    >


    -->

    <button class="ml-2" v-if="modelValue !== defaultValue" @click="$emit('update:modelValue', defaultValue)">
      <arrow-path-icon class="w-5 h-5 inline-flex"></arrow-path-icon>
    </button>
  </div>
</template>

<script lang="ts" setup>
import {ArrowPathIcon, DocumentDuplicateIcon} from '@heroicons/vue/24/outline';
import {ColorChangeEvent, ColorPicker} from "vue-accessible-color-picker";
import {Popover, PopoverButton, PopoverPanel} from "@headlessui/vue";
import {Float, FloatArrow} from "@headlessui-float/vue";
import {computed} from "vue";

defineOptions({
  name: 'ColorInput',
});

export interface Props {
  modelValue: string
  defaultValue: string
  alphaChannel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  defaultValue: '',
  alphaChannel: false,
});

const emit = defineEmits(['update:modelValue']);

function updateColor(event: ColorChangeEvent) {
  let value = event.colors.hex;
  if (!props.alphaChannel && value.length > 7) {
    value = value.slice(0, 7);
  }
  emit('update:modelValue', value);
}

const stringAlphaChannel = computed(() => {
  if (props.alphaChannel) return 'show';
  return 'hide';
});
</script>

<style scoped>
.min-h-color {
  min-height: 27px;
}
</style>
