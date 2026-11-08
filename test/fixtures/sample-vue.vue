<template>
  <div class="container">
    <!-- <span>{{ process.env.TEMPLATE_COMMENTED_VAR }}</span> -->
    <p>Connected to backend</p>
  </div>
</template>

<script setup>
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
</script>
