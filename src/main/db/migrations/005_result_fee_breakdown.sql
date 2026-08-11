-- 請求書(福祉有償運送サービス請求明細書)の内訳列に対応するための金額の分割。
-- これまで T_ResultDestination.CalculatedFee は「運送サービス(移動時間帯)料金」のみを保持していたが、
-- 介護基本料・身体介助・付帯サービス・特別自費はそれぞれ別枠の金額として請求書に載るため、列を分ける。
ALTER TABLE T_ResultDestination ADD COLUMN BaseCareFeeAmount INTEGER;
ALTER TABLE T_ResultDestination ADD COLUMN PhysicalCareFeeAmount INTEGER;
ALTER TABLE T_ResultDestination ADD COLUMN AncillaryServiceFeeAmount INTEGER;
ALTER TABLE T_ResultDestination ADD COLUMN SpecialFeeAmount INTEGER;

-- キャンセル料金は特定の搬送先に紐付くものではなく実績(来訪予定)単位のため、実績側に持たせる。
ALTER TABLE T_TransportResult ADD COLUMN CancellationFeeAmount INTEGER;
