-- 回送料金(事務所からの距離が6km超の利用者について、運転手が利用者宅まで/からの移動で
-- 発生する固定料金)を、利用者マスタのチェックでON/OFFできるようにする。
-- 距離は利用者の自宅位置でほぼ固定のため、搬送実績ごとではなく利用者単位で設定する。
-- ONの利用者は、搬送実績1件につき700円を自動加算する(billingRepository.ts参照)。
ALTER TABLE M_User ADD COLUMN KaisouFeeFlag INTEGER NOT NULL DEFAULT 0;
