-- 定期搬送で曜日ごとに往路・復路それぞれの予定時刻を持たせるための復路予定時刻カラム。
-- 通常の(定期でない)依頼でも任意で使用できる。
ALTER TABLE T_TransportRequest ADD COLUMN ReturnPickupTime TEXT;
