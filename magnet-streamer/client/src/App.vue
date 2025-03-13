<template>
  <div id="app">
    <el-container>
      <el-header>
        <h1>磁力链接在线播放器</h1>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
      <el-footer>
        © {{ new Date().getFullYear() }} 磁力链接在线播放器 - 基于Node.js和Vue.js
      </el-footer>
    </el-container>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.el-header {
  background-color: #409EFF;
  color: white;
  line-height: 60px;
}

.el-footer {
  background-color: #f8f9fa;
  color: #6c757d;
  line-height: 60px;
  position: fixed;
  bottom: 0;
  width: 100%;
}

.el-main {
  padding: 20px;
  margin-bottom: 60px;
}
</style> 