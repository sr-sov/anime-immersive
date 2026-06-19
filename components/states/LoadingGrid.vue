<script setup lang="ts">
/** Skeleton placeholder rail/grid shown while a feed loads. */
withDefaults(defineProps<{ count?: number }>(), { count: 8 })
</script>

<template>
  <div
    class="grid grid-flow-col auto-cols-[42vw] gap-5 overflow-hidden sm:auto-cols-[28vw] lg:auto-cols-[20vw] xl:auto-cols-[15vw]"
    aria-hidden="true"
  >
    <div v-for="n in count" :key="n" class="space-y-3">
      <div class="skeleton aspect-[3/4] w-full rounded-lg" />
      <div class="skeleton h-3 w-3/4 rounded" />
      <div class="skeleton h-3 w-1/3 rounded" />
    </div>
  </div>
</template>
