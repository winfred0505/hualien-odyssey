@echo off
chcp 65001 >nul
title 洄瀾風語：花蓮奇境探索之旅
echo 正在啟動《洄瀾風語：花蓮奇境探索之旅》本地伺服器...
start http://localhost:3088
node server.js
pause
