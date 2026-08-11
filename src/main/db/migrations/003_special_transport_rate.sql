-- 特別搬送の料金(利用者ごとの「特別搬送区分」に応じた固定額)。
-- M_User.SpecialTransportCategory の値と対応させる想定。適用開始日で改定履歴を保持する。

CREATE TABLE M_SpecialTransportRate (
  RateId INTEGER PRIMARY KEY AUTOINCREMENT,
  Category TEXT NOT NULL,
  EffectiveFrom TEXT NOT NULL,
  Amount INTEGER NOT NULL,
  Remarks TEXT,
  CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  CreatedBy TEXT,
  UpdatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UpdatedBy TEXT
);
CREATE INDEX IX_SpecialTransportRate_Category ON M_SpecialTransportRate(Category, EffectiveFrom);

-- 暫定値。ユーザーから正式な金額・区分名の連絡待ち。
-- 「特別搬送料金」マスタ画面から後で正しい値に更新すること。
INSERT INTO M_SpecialTransportRate (Category, EffectiveFrom, Amount, Remarks) VALUES
  ('区分A', '2020-01-01', 2060, '暫定値。正式な金額が決まり次第、マスタ画面から更新してください'),
  ('区分B', '2020-01-01', 3600, '暫定値。正式な金額が決まり次第、マスタ画面から更新してください'),
  ('区分C', '2020-01-01', 4630, '暫定値。正式な金額が決まり次第、マスタ画面から更新してください');
