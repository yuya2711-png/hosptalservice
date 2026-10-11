-- 院内付き添い: 搬送先ごとにチェックすると付帯サービス料金に1650円を加算する。
-- 依頼側に記録し、実績の下書き作成時にそのまま引き継ぐため、依頼・実績の両テーブルに追加する。
ALTER TABLE T_RequestDestination ADD COLUMN InHospitalAccompanimentFlag INTEGER NOT NULL DEFAULT 0;
ALTER TABLE T_ResultDestination ADD COLUMN InHospitalAccompanimentFlag INTEGER NOT NULL DEFAULT 0;
