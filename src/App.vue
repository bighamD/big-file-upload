<template>
  <div id="app">
    <BigFileUpload />
  </div>
</template>

<script>
import BigFileUpload from './components/big-file-upload.vue'

export default {
  name: 'App',
  components: {
    BigFileUpload
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
