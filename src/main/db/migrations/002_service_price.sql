-- サービス単価(移動時間に応じた料金表)。旧Access「サービス単価 登録改廃」画面を踏襲し、
-- 適用開始日ごとに改定履歴を保持する(過去の実績は算出時点の金額をスナップショットとして
-- 保持するため、改定してもさかのぼって変化しない)。

CREATE TABLE M_ServicePriceRevision (
  RevisionId INTEGER PRIMARY KEY AUTOINCREMENT,
  Category TEXT NOT NULL,               -- サービス区分（例: 福祉有償運送）
  EffectiveFrom TEXT NOT NULL,          -- 適用開始日
  BaseFee INTEGER NOT NULL DEFAULT 0,   -- 基本料金
  UnitPrice INTEGER NOT NULL DEFAULT 0, -- 単価（時間帯1区分あたり）
  IntervalMinutes INTEGER NOT NULL DEFAULT 15, -- 時間帯の刻み幅（分）
  Remarks TEXT,
  CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  CreatedBy TEXT,
  UpdatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UpdatedBy TEXT
);
CREATE INDEX IX_ServicePriceRevision_Category ON M_ServicePriceRevision(Category, EffectiveFrom);

-- 時間帯ごとの料金（下限分・上限分・料金）。改定時に自動生成した上で個別に手直しできる。
CREATE TABLE M_ServicePriceTier (
  TierId INTEGER PRIMARY KEY AUTOINCREMENT,
  RevisionId INTEGER NOT NULL REFERENCES M_ServicePriceRevision(RevisionId) ON DELETE CASCADE,
  SeqNo INTEGER NOT NULL,
  LowerMinutes INTEGER NOT NULL,
  UpperMinutes INTEGER NOT NULL,
  Amount INTEGER NOT NULL,
  UNIQUE (RevisionId, SeqNo)
);

-- 実績の搬送先ごとに、移動時間から算出した金額を保持する（算出後の手動修正も可）
ALTER TABLE T_ResultDestination ADD COLUMN CalculatedFee INTEGER;
