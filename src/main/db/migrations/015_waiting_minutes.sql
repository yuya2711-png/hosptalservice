-- 待機料(運転手が利用者を待つ時間)を記録できるようにする。
-- 料金表の基準: 15分毎に500円。15分未満の端数も1区分として切り上げる。
-- 請求集計・請求書では「付帯サービス」列に自動加算する(billingRepository.tsのANCILLARY_SERVICE_FEE_SQL参照)。
ALTER TABLE T_ResultDestination ADD COLUMN WaitingMinutes INTEGER;
