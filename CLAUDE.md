# 搬送管理アプリ (kurofune-hanso-kanri)

NPO法人くろふねの介護タクシー/患者搬送業務向け、Windows用デスクトップアプリ（Electron）。
既存Accessシステムからの移行が背景にある。

## 技術スタック

- Electron 43 + electron-vite + TypeScript
- フロントエンド: React 19（renderer側）、UIライブラリなしの素のstyle props
- カレンダー表示: FullCalendar (`@fullcalendar/react` ほか)
- DB: `node:sqlite`（`DatabaseSync`、better-sqlite3ではなくNode組み込みモジュール）
- IPC: `ipcMain.handle` / `contextBridge`（preload経由、`contextIsolation: true`）

## 起動・ビルド

```bash
npm run dev          # electron-vite dev
npm run typecheck    # tsc (node設定 + web設定の両方)
npm run build:win    # electron-vite build && electron-builder --win
```

## アーキテクチャ

```
src/
  main/            # Electronメインプロセス
    db/
      connection.ts       # DatabaseSync取得、DBパスは %PROGRAMDATA%\Kurofune\data\kurofune.db 固定
      migrate.ts           # migrations/*.sql を順に適用
      migrations/          # 001, 002, ... の連番マイグレーション
      backup.ts             # 起動時バックアップ
      repositories/         # テーブルごとのCRUDロジック（Repositoryパターン）
    ipc/registerIpc.ts     # ipcMain.handle の登録一式
    print/printSchedule.ts # 印刷まわり
  preload/index.ts   # contextBridgeでrendererにAPI公開
  renderer/src/
    AppShell.tsx      # 左ナビ + ページ切り替え（ルーターなし、useStateで管理）
    pages/
      masters/        # 利用者・搬送先・運転手・診療科・サービス単価・特別搬送料金
      requests/       # 搬送依頼
      calendar/       # 搬送カレンダー
      results/        # 搬送実績
      print/          # 印刷
  shared/types/
    entities.ts       # DBスキーマに対応するエンティティ型（main/renderer共通）
    ipc.ts             # IPCチャンネルの型定義
```

新しいマスタ/画面を追加する際は上記と同じ並び（repository → ipc handler → shared type → renderer page → AppShellのNAV_ITEMS）で揃える。

## DB設計の方針（`src/main/db/migrations/001_initial_schema.sql` 冒頭コメントより）

- マスタ（`M_*`）は正規化。トランザクション（実績 `T_TransportResult` 等）は参照先マスタが後で変わっても過去の記録が変化しないよう、当時の値をスナップショット列（`Snapshot*`）で保持する。
- 日時は **JST固定・TEXT (ISO8601)** で保持。UTC変換はしない。
- 削除は物理削除せず `IsActive` / `IsDeleted` の論理削除で行う。
- マイグレーションは連番ファイル追加のみ（既存ファイルの書き換えはしない）。

## 命名規則

- DBカラム: PascalCase（`UserId`, `TransportDate` など）
- TypeScriptのエンティティ型: camelCase（`userId`, `transportDate`）。`entities.ts`でDB→JS命名変換を担う。
- 新規作成用の型は `New*`（例: `NewUser`）、Pick型で入力可能フィールドのみ抜き出す。

## データの機密性

利用者の氏名・住所・要介護度・生活保護フラグなど個人情報（要配慮個人情報を含む）を扱う。ログ出力やサンプルデータでの実名利用は避ける。
