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
6. **搬送依頼の院内付き添いを依頼単位に変更＋運転手の事前割当（2026-10-11、マイグレーション009）**
   当初`T_RequestDestination`（搬送先ごと）に付けていた「院内付き添い」チェックは、搬送先が複数あっても依頼1件につき1回しか発生しない想定のため、`T_TransportRequest.InHospitalAccompanimentFlag`（依頼単位、車椅子・特別搬送と同じ`車椅子・特別搬送`セクション内）に変更した。旧列(`T_RequestDestination.InHospitalAccompanimentFlag`)は実データ保護のため列自体は残しているが、以後書き込まない（常に0のまま）。**実績側(`T_ResultDestination.InHospitalAccompanimentFlag`、請求集計の+1650円加算)は搬送先ごとの入力のままで変更なし**（依頼側フラグの自動引き継ぎは行わない。実績入力時に改めてチェックする運用）。
   同じマイグレーションで`T_TransportRequest.DriverId`（`M_Driver`参照、任意）を追加し、搬送依頼の時点で運転手を事前割当できるようにした（`車椅子・特別搬送`セクション内にドロップダウンを追加、`RequestsPage.tsx`で`window.api.drivers.list()`を新たに取得）。実績側の運転手(`T_ResultLeg.DriverId`、脚ごと)とは別物で、紐付けや自動引き継ぎはしていない。
7. **特別搬送料金を実物の料金表どおりに修正（2026-10-11、マイグレーション010）**
   ユーザーから実物の「料金表」画像（`搬送管理\料金表..JPG`）を共有してもらい、既存実装との差分を調査した結果、特別搬送料金が最も大きくずれていた。旧実装は根拠不明の「区分A/B/C」に暫定額(2,060円/3,600円/4,630円)を割り当てていたが、実際は**階段の段数・移動距離**で決まる4段階だった: 階段60段以上=6,000円、40〜60段未満=5,000円、20〜40段未満=4,000円、連続10段以上または移動300m以上または歩行補助のみ=2,500円（車椅子による2名体制が前提、月8回(4往復まで)の利用上限、1割もしくは2割・3割負担という条件も記載されているが未実装）。
   → `M_SpecialTransportRate`の旧3件を削除し、上記4件を正式値として投入（区分名と金額は文字列一致で`M_User.SpecialTransportCategory`/`T_ResultDestination.SpecialTransportCategory`から参照されるだけで外部キーではないため、削除・差し替えが可能）。ローカルの検証用ダミーデータ（利用者3名の特別搬送区分）も新区分名に更新済み。`ResultsPage.tsx`の「特別搬送区分」ドロップダウン（元々存在していた）に金額を併記する表示に変更(`階段60段以上(6,000円)`のように)。`SpecialTransportRatesPage.tsx`の「暫定値」注記も削除。
   **`M_User`側の「特別搬送区分」欄は自由入力のまま変更していない**（ユーザーからは実績画面のみ指示されたため）。区分名のタイプミスでマスタと一致しなくなるリスクが残るので、将来的にはこちらもドロップダウン化を検討。
   画像(`搬送管理\料金表..JPG`)と現行実装の突き合わせでは、他に以下の差分が見つかっている:
8. **院内介助の時間入力＋自動計算（2026-10-11、マイグレーション011）**
   搬送実績の搬送先ごとに「院内介助時間(分)」の数値入力を追加（`ResultsPage.tsx`、`T_ResultDestination.InHospitalCareMinutes`）。料金表の基準「3,300円(60分まで、くろふねの車両を利用した場合)、以降60分ごとに+3,300円+税」に基づき、**60分単位で切り上げて3,300円を乗じた額**を自動計算する。按分する税額までは管理していない(既存の外税は請求書印刷時の手入力のみ)。
   計上先の内訳列は**ユーザーに確認の上「付帯サービス」に決定**（請求書に「院内介助」専用の列が無いため）。`billingRepository.ts`の`ANCILLARY_SERVICE_FEE_SQL`に院内付き添い(+1650円固定)と同様の形で追加し、`((rd.InHospitalCareMinutes + 59) / 60) * 3300`という整数演算の切り上げ式で計算する（SQLite上で列がINTEGER型であることを前提にした整数除算。REAL化すると切り上げにならない点に注意——検証はメモリ上のINTEGER列テーブルで実施し、実際の列定義と同じ挙動になることを確認済み）。実績画面にも計算結果の金額をその場で表示する注記を追加。
   - **待機料・回送料金・迎車料金**: いずれも概念自体が未実装(待機料=15分毎500円、回送・迎車料金=事務所から6km超でそれぞれ700円)。→待機料は項目12で対応済み。
9. **通院等乗降介助を往路/復路の脚ごとに判定＋非該当時の基本乗車料1,500円自動加算（2026-10-11、マイグレーション012）**
   旧実装は搬送先1件につき1つの「通院等乗降介助」チェック(`T_ResultDestination.TsuuinKaigoKihonFlag`、料金計算なしの単なるフラグ)だったが、ユーザーから「往路復路でそれぞれチェックできるように。チェックがない場合は1500円追加」と指示を受け、`T_ResultLeg.TsuuinKaigoKihonFlag`(往路/復路それぞれ個別)に変更した。料金表の「97単位 or 基本乗車料1,500円」のうち、**チェックなし(=通院等乗降介助に該当しない)の場合に基本乗車料1,500円を介護基本料へ自動加算**する(97単位側の計算は引き続き未実装)。
   - 計上先は「介護基本料」。ユーザーに確認はしていないが、UIで本チェックボックスの直後に元々「介護基本料(円)」欄が配置されていた設計上の隣接関係から、この対応が自然と判断した。
   - **既存データへの遡及的な金額変化を防ぐため、新列のデフォルトは`1`(該当する=追加課金なし)にした**。もしデフォルトを`0`にすると、マイグレーション実行時点で存在する全ての過去の脚(往路/復路)に1,500円が一律で遡って加算され、既に確定・印刷済みの可能性がある過去の請求額が変わってしまう。デフォルト`1`にしたことで、既存12件の脚は全て「該当する」扱いとなり、各搬送先の計算結果(介護基本料の実効値)が移行前と完全に一致することをDB直接クエリで検証済み。新規に作成する脚(下書き生成時・フォームでの追加時)もデフォルト`true`(該当する)。
   - `billingRepository.ts`に`BASE_CARE_FEE_SQL`(`COALESCE(rd.BaseCareFeeAmount,0) + 非該当かつ取消していない脚の数 × 1500`)を追加し、`DESTINATION_FEE_SUM_SQL`と請求書の`baseCareFee`の両方をこれに差し替えた。
   - `ResultsPage.tsx`: 搬送先ごとのチェックボックス群から「通院等乗降介助」を削除し、`LegEditor`コンポーネント(往路/復路で共用)にチェックボックスを追加。介護基本料欄の下に加算額のプレビュー注記を追加。
   - 動作確認: typecheck成功。マイグレーション012適用後、既存データの計算結果が完全一致することをNode直接スクリプトで検証。
10. **搬送実績に「タクシー券」枚数欄を追加、1枚450円で全体の金額から自動減算（2026-10-11、マイグレーション013）**
   `T_TransportResult.TaxiTicketCount`(搬送実績1件につき1つ、搬送先ごとではない)を追加。ユーザーの「タクシー券2枚×450=900円を全体の料金から引く」という指示どおり、搬送先ごとの各種料金を合算した後の実績単位の金額(キャンセル料金を足す場所と同じ段階)から`枚数×450円`を差し引く。`billingRepository.ts`の`RESULT_LEVEL_ADJUSTMENT_SQL`(`COALESCE(r.CancellationFeeAmount,0) - COALESCE(r.TaxiTicketCount,0)×450`)として実装し、請求集計(`getMonthlyBillingSummary`/`getMonthlyBillingDetail`)の両方に適用。
   - **請求書印刷(`printInvoice.ts`)との関係に注意**: 実物の請求書フォームには元々「タクシー券相殺額」という**手入力**の調整欄(`InvoiceAdjustments.taxiTicketOffsetAmount`、`BillingPage.tsx`の印刷ダイアログで毎回入力)が既にあった。今回追加した自動計算分とは別物として扱うことにし、`売上合計`自体は従来通り(搬送先ごとの内訳の素の合計)のままにして、`ご請求金額`を計算する最後の段階で**新しいサマリ欄「タクシー券(自動計算)」を追加**し、そこで`data.taxiTicketTotal`(`getInvoiceData`が新たに返す、月内の実績のタクシー券枚数×450円の合計)を既存の「タクシー券相殺額」とは別に差し引くようにした。**実物の紙の請求書フォームには無い欄を追加した点に注意**(CLAUDE.mdの「実物の請求書を忠実に再現」という従来方針からの逸脱)。既存の「タクシー券相殺額」欄は手動での追加調整用としてそのまま残っており、スタッフが引き続き使うかどうかは要検討。
   - `ResultsPage.tsx`の基本情報セクション(キャンセル料金の下)に「タクシー券(枚)」入力欄を追加。入力中に減算額のプレビュー注記を表示。
   - 動作確認: typecheck成功。マイグレーション013適用後、`ResultId=8`(介護基本料込みで4,550円)に対しタクシー券2枚を仮設定してSQLを直接検証し、3,650円(4,550-900)になることを確認(BEGIN/ROLLBACKで実データは変更していない)。
   - **利用者負担割合(1割/2割・3割)**: `SnapshotBenefitRate`は保存するだけで、料金計算には一切使われていない。
11. **利用者マスタに「契約者」チェックボックスを追加（2026-10-11、マイグレーション014）**
   `M_User.IsContractor`を追加し、`UsersPage.tsx`の利用者詳細フォームに「契約者」チェックボックスを追加した（契約日の下、車椅子チェックの上）。契約者でない場合は保険が適用できないという業務上の背景があるが、**どの項目にどう影響するかは未確定のため、今回はチェックボックスの追加のみ**でロジックは一切実装していない（ユーザー指示どおり）。将来、保険適用可否の判定に使う場合はこのフラグを参照する形になる見込み。
12. **待機料の時間入力＋自動計算（2026-10-11、マイグレーション015）**
   搬送実績の搬送先ごとに「待機時間(分)」の数値入力を追加（`ResultsPage.tsx`、`T_ResultDestination.WaitingMinutes`）。院内介助時間(項目8)と同じ並びに配置した。料金表の基準「15分毎500円」に基づき、**15分単位で切り上げて500円を乗じた額**を自動計算する。院内介助時間と同様、按分する税額までは管理していない。
   計上先の内訳列も院内介助時間・院内付き添いと同様に**「付帯サービス」**とした(請求書に「待機料」専用の列が無いため)。`billingRepository.ts`の`ANCILLARY_SERVICE_FEE_SQL`に`((rd.WaitingMinutes + 14) / 15) * 500`という整数演算の切り上げ式を追加(院内介助時間の式と同じ考え方。WaitingMinutes列がINTEGER型であることが前提で、検証はメモリ上のINTEGER列テーブルで実施して同じ挙動になることを確認済み)。実績画面にも計算結果の金額をその場で表示する注記を追加。
   - 動作確認: typecheck成功。
13. **回送料金を利用者マスタのチェックで自動加算（2026-10-11、マイグレーション016）**
   ユーザーから「利用者画面にチェックボックスを追加して、チェックONで700円プラス」と指示を受けた。回送料金(事務所から6km超の場合に発生)は距離に応じた料金だが、**利用者の自宅位置はほぼ固定**という業務上の前提から、搬送実績ごとではなく`M_User.KaisouFeeFlag`(利用者単位のチェック)として実装し、ONの利用者は**搬送実績1件につき固定700円**を自動加算する(`UsersPage.tsx`の基本情報タブ、生活保護チェックの下に追加)。
   搬送先ごとではなく実績単位の加算のため、タクシー券(項目10)と同じ階層で扱う。`billingRepository.ts`に`RELOCATION_FEE_SQL`(`(SELECT KaisouFeeFlag FROM M_User WHERE UserId = r.UserId) × 700`)を追加し、`RESULT_LEVEL_ADJUSTMENT_SQL`(キャンセル料金・タクシー券減算と同じ式)に組み込んだ→請求集計(`getMonthlyBillingSummary`/`getMonthlyBillingDetail`)の両方に自動適用。
   - **請求書印刷との関係**: タクシー券(自動計算)とは異なり、回送料金は売上を増やす側の加算なので、キャンセル料金と同じ扱いで`salesTotal`に含めた(タクシー券のように`billedAmount`側で別途減算する形にはしていない)。`getInvoiceData`が返す`relocationFeeTotal`(対象月の実績件数×700、フラグOFFなら0)を使い、請求書のサマリバーに「回送料金」セルを追加(キャンセル料金セルの隣)。
   - 動作確認: typecheck成功。SQLの加減算ロジック(フラグON/OFFそれぞれ)をNode直接スクリプトで検証。
14. **有料道路代・駐車料金は既存の「立替費用」欄で表現（2026-10-11、スキーマ変更なし）**
   ユーザーから「有料道路・駐車料(実費請求)を立替用欄で使えるようにして」と指示を受けたが、`T_ResultDestination.AdvancedExpense`(立替費用)は元々「実費でかかった費用をそのまま請求書の立替費用列に計上する」という用途の欄で、新しい列は不要だった。`ResultsPage.tsx`のラベルを「立替費用(有料道路代・駐車料金など実費)」に変更し、placeholderと説明注記を追加して、この欄がその用途に使えることを明示しただけ(ロジック・DBスキーマの変更なし)。

### 未実装・要対応のTODO

- **搬送依頼のキャンセル有償/無償（2026-10-11追加、`T_TransportRequest.CancelPaidFlag`、マイグレーション008）**: キャンセル情報セクションに「無償/有償」のラジオボタンを追加し、フラグのみ記録できるようにした。**有償の場合の料金額が未確定のため、料金計算・集計（請求集計・請求書印刷への反映）は未実装。** 金額が判明したら、院内付き添い（`InHospitalAccompanimentFlag`、`billingRepository.ts`の`ANCILLARY_SERVICE_FEE_SQL`）と同様に、固定額かマスタ参照かを決めてから`billingRepository.ts`の集計SQL・`printInvoice.ts`に組み込む。
- **迎車料金の自動計算（2026-10-11の料金表調査で判明、未着手。院内介助は項目8、通院等乗降介助は項目9、待機料は項目12、回送料金は項目13で対応済み）**: 事務所から6km超で700円(回送料金と同額だが別概念)。実装するには距離/方向などの新しい入力項目の追加が先に必要。

### 環境に関する既知の注意点

- 開発機でNode.js（`node:sqlite`やビルドツールの一部）が原因不明のアクセス違反（0xC0000005）を起こすことがあった。`winget upgrade --id OpenJS.NodeJS.22`でNode.js本体を再インストールしたら解消した。同様の症状（`npm install`や`npm run dev`が理由不明にセグフォルトする）が出たら、まずNode.js再インストールを疑う。
- `npm install`後、`electron`パッケージ本体（`node_modules/electron/dist/`）が未ダウンロードのままになることがあった。その場合は`node node_modules/electron/install.js`を手動実行すると解決する。

### データの現状

- ローカル（このPC）のDB（`C:\ProgramData\Kurofune\data\kurofune.db`）には動作確認用のダミーデータ（利用者・搬送先・運転手・診療科・サービス単価・単発/定期搬送依頼・実績）を投入済み。**gitには一切含まれない**（DBファイルはリポジトリ外、マイグレーションSQLのみgit管理）。
- 実際のカイポケCSV（`利用者情報.csv`/`被保険者証情報.csv`）は確認時点でヘッダ行のみでデータ行は空（テンプレート）だった。実データが揃い次第CSVインポート画面から取り込む想定。
