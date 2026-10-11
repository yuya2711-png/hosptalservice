-- 利用者が契約者かどうかを記録する(契約者でない場合は保険が適用できないため)。
-- どの項目にどう影響するかは未確定のため、今は記録のみでロジックには未使用。
ALTER TABLE M_User ADD COLUMN IsContractor INTEGER NOT NULL DEFAULT 0;
