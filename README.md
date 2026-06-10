# 改衣記帳 App

改衣店訂單與記帳管理系統。

**線上網址**: https://kg-yc.github.io/alteration-app/

## 功能

- 訂單建檔（客戶、項目、品牌、改法、尺寸、師傅、類型、來源平台、費用）
- 訂單查詢與狀態管理
- 統計（每月/每年毛利、各師傅工資、各平台收入），可點擊查看明細與單筆損益
- 設定頁：管理項目名稱/品牌/改法/尺寸/師傅/類型/來源平台等下拉選項

## 技術棧

- React + Vite
- Firebase Auth（Google 登入，email 白名單）+ Firestore

## 開發

```bash
npm install
npm run dev      # 開發伺服器
npm run build    # build 到 dist/
npm run lint     # ESLint 檢查
```

## 部署

Build 後用 `git subtree split --prefix dist` 推到 `gh-pages` branch。
