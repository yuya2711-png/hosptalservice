-- 院内介助にかかった時間(分)を記録できるようにする。
-- 料金表(福祉有償運送)の基準: 3,300円(60分まで、くろふねの車両を利用した場合)、
-- 以降60分ごとに+3,300円+税。按分する税額までは管理しないため、
-- 60分単位の切り上げで3,300円を乗じた額を請求集計・請求書の「付帯サービス」列に
-- 自動加算する(billingRepository.tsのANCILLARY_SERVICE_FEE_SQL参照)。
ALTER TABLE T_ResultDestination ADD COLUMN InHospitalCareMinutes INTEGER;
