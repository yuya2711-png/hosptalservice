-- 搬送実績に「タクシー券」の枚数を記録できるようにする。
-- 1枚450円換算で、枚数×450円を実績全体の金額(請求集計・請求書の売上合計)から自動的に差し引く。
ALTER TABLE T_TransportResult ADD COLUMN TaxiTicketCount INTEGER;
