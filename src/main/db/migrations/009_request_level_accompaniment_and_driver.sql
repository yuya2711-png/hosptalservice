-- 院内付き添いを搬送先ごとではなく依頼全体の項目(車椅子・特別搬送と同じ単位)に変更する。
-- 旧列(T_RequestDestination.InHospitalAccompanimentFlag)は使用を停止するが、
-- 既存データを壊さないよう列自体は残す(常にデフォルト値のまま、新規作成分は書き込まない)。
ALTER TABLE T_TransportRequest ADD COLUMN InHospitalAccompanimentFlag INTEGER NOT NULL DEFAULT 0;

-- 搬送依頼の時点で運転手を事前に割り当てられるようにする(任意項目、運転手マスタから選択)。
ALTER TABLE T_TransportRequest ADD COLUMN DriverId INTEGER REFERENCES M_Driver(DriverId);
