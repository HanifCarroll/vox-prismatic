<script setup>
import { computed } from 'vue'
import { Button } from '@/components/ui/button'

const props = defineProps({
  label: { type: String, default: '' },
  severity: { type: String, default: '' }, // default | secondary | danger | info
  outlined: { type: Boolean, default: false },
  text: { type: Boolean, default: false },
  size: { type: String, default: 'default' }, // small | default | large
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})

const variant = computed(() => {
  if (props.text) return 'ghost'
  if (props.outlined) return 'outline'
  switch (props.severity) {
    case 'danger':
      return 'destructive'
    case 'secondary':
      return 'secondary'
    default:
      return 'default'
  }
})

const sizeMap = computed(() => {
  switch (props.size) {
    case 'small':
      return 'sm'
    case 'large':
      return 'lg'
    default:
      return 'default'
  }
})
</script>

<template>
  <Button :variant="variant" :size="sizeMap" :disabled="disabled || loading" :type="type">
    <span v-if="loading" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/50 border-t-transparent"></span>
    <slot>
      {{ label }}
    </slot>
  </Button>
  
</template>

