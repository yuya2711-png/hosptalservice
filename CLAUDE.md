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
    csv.ts               # SJIS CSV読み込み・パース(カイポケCSVインポート用)
    operatorState.ts      # 「今の操作者名」の保持(ログイン機能ではなく手入力＋ファイル永続化)
    db/
      connection.ts       # DatabaseSync取得、DBパスは %PROGRAMDATA%\Kurofune\data\kurofune.db 固定
      migrate.ts           # migrations/*.sql を順に適用
      migrations/          # 001, 002, ... の連番マイグレーション
      backup.ts             # 起動時バックアップ＋バックアップ一覧・復元(リストア)
      repositories/         # テーブルごとのCRUDロジック（Repositoryパターン）
        billingRepository.ts    # 月次請求集計・請求書印刷用データ取得
        importRepository.ts     # カイポケCSV(利用者情報/被保険者証情報)インポート
    ipc/registerIpc.ts     # ipcMain.handle の登録一式
    print/
      printSchedule.ts     # 日次スケジュール表印刷
      printInvoice.ts      # 月次請求書印刷(福祉有償運送サービス請求明細書)
  preload/index.ts   # contextBridgeでrendererにAPI公開
  renderer/src/
    AppShell.tsx      # 左ナビ + ページ切り替え（ルーターなし、useStateで管理）＋操作者表示/変更
    pages/
      masters/        # 利用者・搬送先・運転手・診療科・サービス単価・特別搬送料金
      requests/       # 搬送依頼(単発・定期搬送)
      calendar/       # 搬送カレンダー
      results/        # 搬送実績(料金内訳: 運送サービス/介護基本/身体介助/付帯サービス/特別自費)
      billing/        # 請求集計(月次・利用者別)＋請求書印刷トリガー
      print/          # 印刷(日次スケジュール表)
      ImportPage.tsx  # CSVインポート(カイポケ形式)
      SystemStatusPage.tsx # システム情報＋バックアップ復元
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

## 実装状況・引き継ぎメモ（2026-08時点）

Phase 1（マスタ・依頼・カレンダー・実績・印刷・サービス単価・特別搬送料金・定期搬送）に続けて、以下5点を実装済み。

1. **月次請求集計**（`billingRepository.ts` / `pages/billing/BillingPage.tsx`）
   利用者ごとに月単位で国保連請求分/自費分を集計。搬送先ごとの各種料金列（運送サービス・介護基本・身体介助・付帯サービス・特別自費・立替費用）＋実績単位のキャンセル料金を合算する。
2. **操作者記録**（`operatorState.ts`）
   ログイン機能は持たず、起動時に手入力した操作者名をファイル（DBと同じフォルダの`operator.json`）に永続化するだけの簡易な仕組み。全マスタ・依頼・実績のCreatedBy/UpdatedByに反映される。AppShellのuseEffectで`window.api`未定義時に丸ごとクラッシュしないよう、async関数でラップして呼ぶこと（同期的に投げるとReactのエラーバウンダリでアプリ全体が落ちる）。
3. **バックアップ復元**（`db/backup.ts`の`listBackups`/`restoreFromBackup`）
   復元前に`pre_restore_*.db`として現状を退避し、復元後は`app.relaunch()`で自動再起動する。ファイル名はパストラバーサル対策で`kurofune_*.db`形式のみ許可。
4. **CSVインポート**（`csv.ts` / `importRepository.ts` / `pages/ImportPage.tsx`）
   カイポケの「利用者情報.csv」「被保険者証情報.csv」（Shift_JIS、`iconv-lite`で変換）が対象。**被保険者証情報.csv側にはID列がなく利用者名でしか突き合わせられない**ため、先に利用者情報.csvを取り込む前提。再インポート時は利用者名(+カナ)で既存レコードを検索し、あれば更新・なければ新規作成（重複させない）。
5. **請求書印刷**（`print/printInvoice.ts`）
   実物の「福祉有償運送サービス請求明細書」（NPO法人くろふね発行）をもとに、A4横のHTML→PDFで再現。列構成は運送サービス/介護基本/身体介助/付帯サービス/特別自費/立替費用/キャンセル料金＋売上合計/外税/値引/タクシー券相殺額/ご請求金額。外税・値引・タクシー券相殺額・売上明細書番号はDBに保存せず、印刷時にその場で手入力する運用（月ごとの一時調整のため）。
   → この対応のため、`T_ResultDestination`に`BaseCareFeeAmount`/`PhysicalCareFeeAmount`/`AncillaryServiceFeeAmount`/`SpecialFeeAmount`、`T_TransportResult`に`CancellationFeeAmount`をマイグレーション005で追加。既存の`CalculatedFee`は「運送サービス（移動時間帯）料金」のみを表す点に注意（他の内訳と分離した）。

### 環境に関する既知の注意点

- 開発機でNode.js（`node:sqlite`やビルドツールの一部）が原因不明のアクセス違反（0xC0000005）を起こすことがあった。`winget upgrade --id OpenJS.NodeJS.22`でNode.js本体を再インストールしたら解消した。同様の症状（`npm install`や`npm run dev`が理由不明にセグフォルトする）が出たら、まずNode.js再インストールを疑う。
- `npm install`後、`electron`パッケージ本体（`node_modules/electron/dist/`）が未ダウンロードのままになることがあった。その場合は`node node_modules/electron/install.js`を手動実行すると解決する。

### データの現状

- ローカル（このPC）のDB（`C:\ProgramData\Kurofune\data\kurofune.db`）には動作確認用のダミーデータ（利用者・搬送先・運転手・診療科・サービス単価・単発/定期搬送依頼・実績）を投入済み。**gitには一切含まれない**（DBファイルはリポジトリ外、マイグレーションSQLのみgit管理）。
- 実際のカイポケCSV（`利用者情報.csv`/`被保険者証情報.csv`）は確認時点でヘッダ行のみでデータ行は空（テンプレート）だった。実データが揃い次第CSVインポート画面から取り込む想定。
