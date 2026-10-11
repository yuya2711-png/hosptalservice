-- 特別搬送料金を、根拠不明だった暫定の「区分A/B/C」(2,060円/3,600円/4,630円)から、
-- 実物の料金表(福祉有償運送 料金表)で確認できた階段段数・移動距離による正式な区分に置き換える。
-- 区分名はM_User.SpecialTransportCategory/T_ResultDestination.SpecialTransportCategoryと
-- 文字列一致で参照されるだけの疎結合のため、外部キー制約はなく削除・差し替えが可能。
DELETE FROM M_SpecialTransportRate WHERE Category IN ('区分A', '区分B', '区分C');

INSERT INTO M_SpecialTransportRate (Category, EffectiveFrom, Amount, Remarks, CreatedBy, UpdatedBy) VALUES
  ('階段60段以上', '2020-01-01', 6000,
   '料金表(福祉有償運送)の正式値。車椅子による2名での搬送が前提。', NULL, NULL),
  ('階段40〜60段未満', '2020-01-01', 5000,
   '料金表(福祉有償運送)の正式値。車椅子による2名での搬送が前提。', NULL, NULL),
  ('階段20〜40段未満', '2020-01-01', 4000,
   '料金表(福祉有償運送)の正式値。車椅子による2名での搬送が前提。', NULL, NULL),
  ('連続10段以上・移動300m以上・歩行補助のみ', '2020-01-01', 2500,
   '料金表(福祉有償運送)の正式値。連続10段以上の階段、または居宅から駐車車両までの移動が300m以上、または歩行補助のみを行う場合(乗降介助併用時は20段以上の階段として扱う)。', NULL, NULL);
