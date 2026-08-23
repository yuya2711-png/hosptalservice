-- 旧Access版(搬送管理.xlsx「06.搬送実績入力」画面)の実データ調査で判明した3点を追従する。

-- (1) 往路/復路をそれぞれ個別に取消できるようにする。
-- 旧画面には各脚(往路/復路)ごとに「取消」ボタンがあり、片道のみキャンセルする運用があった。
ALTER TABLE T_ResultLeg ADD COLUMN CancelFlag INTEGER NOT NULL DEFAULT 0;

-- (2) 特別搬送: 利用者マスタに区分(認定)が無い利用者でも、実績ごとにスポットで区分を
-- 指定して料金計算できるようにする。旧画面の実績一覧の絞り込みに「特搬認定外の特別搬送のみ」
-- という項目があり、認定なしの特別搬送も想定されていたため。
ALTER TABLE T_ResultDestination ADD COLUMN SpecialTransportCategory TEXT;

-- (3) 透析通院の実績を記録できるようにする。旧画面の実績入力に透析専用の項目があった。
ALTER TABLE T_ResultDestination ADD COLUMN DialysisFlag INTEGER NOT NULL DEFAULT 0;
