-- 搬送依頼のキャンセル情報に有償/無償の区分を追加する。
-- 有償キャンセルの料金は金額未確定のため、フラグのみ記録する(料金計算は未実装・要対応。CLAUDE.md参照)。
ALTER TABLE T_TransportRequest ADD COLUMN CancelPaidFlag INTEGER NOT NULL DEFAULT 0;
