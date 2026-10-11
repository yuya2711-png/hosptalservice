-- 通院等乗降介助を搬送先ごとではなく往路/復路それぞれの脚ごとに判定できるようにする。
-- 該当しない場合(=チェックなし)、介護基本料に基本乗車料1,500円を自動加算する(billingRepository.ts参照)。
-- デフォルトは1(該当する=追加課金なし)とし、既存の実績データの請求額が遡及的に変わらないようにする
-- (旧列T_ResultDestination.TsuuinKaigoKihonFlagはこれまで料金計算に使われていなかった単なるフラグだったため、
--  もし新列のデフォルトを0にすると、過去の全実績に1,500円が遡って加算されてしまう)。
ALTER TABLE T_ResultLeg ADD COLUMN TsuuinKaigoKihonFlag INTEGER NOT NULL DEFAULT 1;
