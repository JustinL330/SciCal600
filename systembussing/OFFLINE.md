# SystemBussing CPU 模擬器：離線版

## Mac

下載並解壓 SystemBussing-CPU-Simulator-Mac.zip，雙擊 CPU Simulator.app。
可將 App 拖到「應用程式」資料夾，日後由 Launchpad 或 Finder 開啟。
支援 macOS 13 或以上；同一程式支援 Apple Silicon 和 Intel。
模擬器已內附於 App，不需要網站、伺服器、安裝套件或網路。
此版本為本機簽署，未經 Apple 公證；首次啟動可能需要 macOS 的使用者確認。
「Download HTML／下載 HTML」可另外儲存一份離線副本。

## iPhone／iPad

1. 首次連線時，用 Safari 開啟 https://systembussing.scical600.pages.dev/。
2. 等頁面底部「Offline app／離線 App」顯示「已儲存在此裝置 · 可離線使用」。
3. 在 Safari 點「分享」→「加入主畫面」→「加入」。若系統顯示「作為網頁 App 開啟」，保持啟用。
4. 從主畫面開啟 CPU Simulator，確認離線就緒後，可用飛航模式測試。

手機版是可安裝的離線網頁 App；首次安裝需要網站，安裝完成後可離線運作。
iPhone／iPad 原生 .ipa 的安裝需要 Apple 簽署或 App Store 發佈，因此這個下載包沒有提供未簽署的 .ipa。
請保留 App 的本機資料；刪除 App 或清除網站資料後，需要連線重新儲存。

## Windows／Linux／其他電腦

直接用 Chrome、Edge、Safari 或 Firefox 開啟 SystemBussing-CPU-Simulator-Offline.html。
這是獨立離線檔案，所有計算及介面都內含在檔案中。
.exe 僅適用 Windows；目前依使用裝置提供 Mac 原生 .app。

## 模擬器操作

輸入整數後確認輸入；使用上一步、下一步或播放。
預設程式共 38 步，輸入 10 時結果為 13。
語言按鈕切換 English／繁體中文；手機可切換易讀模式及完整電路圖。
所有程式運算、記憶體和暫存器都在裝置本機執行。

## Acknowledgements

Project-history thanks to sinx for an early program-design contribution and Prof. Bell LIU for the teaching context. The distributed project does not bundle course slides, photographs, videos, or proprietary media.

## Cloudflare 網站更新

SystemBussing 現在是 SciCal600 倉庫內的附屬計算器，由倉庫根目錄執行 `npm run deploy`，與 SciCal600 及 LMC 一起發佈。
正式網址是 `https://systembussing.scical600.pages.dev/`；主站路径 `https://scical600.pages.dev/systembussing/` 继续作为备用入口，旧的 `https://systembussing.pages.dev/` 只保留为重新导向入口。
