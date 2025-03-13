<template>
  <div id="app">
    <header>
      <h1>磁力链接在线播放器</h1>
    </header>
    <main>
      <router-view />
    </main>
    <footer>
      <p>基于 Vue + Node.js + torrent-stream 实现</p>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  background-color: #1e88e5;
  color: white;
  text-align: center;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

footer {
  text-align: center;
  padding: 1rem;
  background-color: #f0f0f0;
  border-top: 1px solid #ddd;
  font-size: 0.9rem;
  color: #666;
}
</style> 