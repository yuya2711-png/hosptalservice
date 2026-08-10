-- Phase 1 初期スキーマ
-- 方針: マスタは正規化、トランザクション(実績)は参照先マスタが後で変わっても
-- 過去の記録が変化しないよう当時の値をスナップショットで保持する。
-- 日時はJST固定でTEXT(ISO8601)として保持し、UTC変換は行わない。
-- 削除は物理削除せず IsActive / IsDeleted の論理削除で行う。

CREATE TABLE M_Department (
  DepartmentId INTEGER PRIMARY KEY AUTOINCREMENT,
  Name TEXT NOT NULL,
  SortOrder INTEGER,
  IsActive INTEGER NOT NULL DEFAULT 1,
  CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  CreatedBy TEXT,
  UpdatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UpdatedBy TEXT
);

CREATE TABLE M_Destination (
  DestinationId INTEGER PRIMARY KEY AUTOINCREMENT,
  Name TEXT NOT NULL,
  NameKana TEXT,
  PostalCode TEXT,
  Address TEXT,
  PhoneNumber TEXT,
  Remarks TEXT,
  IsActive INTEGER NOT NULL DEFAULT 1,
  CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  CreatedBy TEXT,
  UpdatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UpdatedBy TEXT
);

CREATE TABLE M_Driver (
  DriverId INTEGER PRIMARY KEY AUTOINCREMENT,
  Name TEXT NOT NULL,
  NameKana TEXT,
  PhoneNumber TEXT,
  Remarks TEXT,
  IsActive INTEGER NOT NULL DEFAULT 1,
  CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  CreatedBy TEXT,
  UpdatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UpdatedBy TEXT
);

-- 利用者（既存Accessの「利用者番号」に相当するIDをそのまま新PKとして移行時に温存する想定）
CREATE TABLE M_User (
  UserId INTEGER PRIMARY KEY AUTOINCREMENT,
  Name TEXT NOT NULL,
  NameKana TEXT,
  Sex INTEGER,                          -- 1=男性, 2=女性
  BirthDate TEXT,
  PostalCode TEXT,
  Address TEXT,
  PhoneNumber TEXT,
  TransactionStatus TEXT,               -- 取引状態
  LivelihoodProtectionFlag INTEGER NOT NULL DEFAULT 0, -- 生活保護
  SpecialTransportCategory TEXT,        -- 特別搬送区分
  WheelchairFlag INTEGER NOT NULL DEFAULT 0,
  CareManager TEXT,
  ContractDate TEXT,
  Remarks TEXT,
  IsDeleted INTEGER NOT NULL DEFAULT 0,
  CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  CreatedBy TEXT,
  UpdatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UpdatedBy TEXT
);
CREATE INDEX IX_User_Name ON M_User(Name);

-- 被保険者証情報（利用者:1対多、履歴管理。有効期間は半開区間[ValidFrom, ValidTo)）
CREATE TABLE T_UserInsuranceCertificate (
  CertificateId INTEGER PRIMARY KEY AUTOINCREMENT,
  UserId INTEGER NOT NULL REFERENCES M_User(UserId),
  CertificationType TEXT,               -- 認定区分
  InsurerName TEXT,
  InsurerNumber TEXT,
  InsuredNumber TEXT,                   -- 被保険者番号
  CareLevel TEXT,                       -- 要介護度
  CertificationDate TEXT,
  ValidFrom TEXT,
  ValidTo TEXT,
  CareSupportOffice TEXT,               -- 居宅支援事業所
  CareManager TEXT,
  CommunityCareCenter TEXT,
  PlanRequestNotifiedDate TEXT,
  BenefitRate REAL,                     -- 給付率
  IsCurrent INTEGER NOT NULL DEFAULT 1,
  CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  CreatedBy TEXT,
  UpdatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UpdatedBy TEXT
);
CREATE INDEX IX_Certificate_User ON T_UserInsuranceCertificate(UserId, IsCurrent);

-- 搬送依頼
CREATE TABLE T_TransportRequest (
  RequestId INTEGER PRIMARY KEY AUTOINCREMENT,
  ReceivedDate TEXT NOT NULL,
  IsRecurring INTEGER NOT NULL DEFAULT 0,
  RecurringGroupId INTEGER,
  UserId INTEGER NOT NULL REFERENCES M_User(UserId),
  RequestedBy TEXT,
  TransportDate TEXT NOT NULL,
  PickupTime TEXT,
  SuitableVehicle TEXT,
  ServiceTicketFlag INTEGER NOT NULL DEFAULT 0, -- 提供票
  CompanionName TEXT,                    -- 同乗者
  WheelchairFlag INTEGER NOT NULL DEFAULT 0,
  SpecialTransportFlag INTEGER NOT NULL DEFAULT 0,
  CancelDate TEXT,
  CancelReason TEXT,
  PaidFlag INTEGER NOT NULL DEFAULT 1,   -- 有償/無償
  Remarks TEXT,
  CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  CreatedBy TEXT,
  UpdatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UpdatedBy TEXT
);
CREATE INDEX IX_Request_Date ON T_TransportRequest(TransportDate);
CREATE INDEX IX_Request_User ON T_TransportRequest(UserId);

-- 搬送先明細（縦持ち。最大3件という制約はアプリ側でチェックし、DB制約には埋め込まない）
CREATE TABLE T_RequestDestination (
  RequestDestinationId INTEGER PRIMARY KEY AUTOINCREMENT,
  RequestId INTEGER NOT NULL REFERENCES T_TransportRequest(RequestId) ON DELETE CASCADE,
  SeqNo INTEGER NOT NULL,
  DestinationId INTEGER NOT NULL REFERENCES M_Destination(DestinationId),
  DepartmentId INTEGER REFERENCES M_Department(DepartmentId),
  Reason TEXT,
  RoundTripFlag INTEGER NOT NULL DEFAULT 1,
  KaigoKihonFlag INTEGER NOT NULL DEFAULT 0,
  UNIQUE (RequestId, SeqNo)
);

-- 搬送実績
CREATE TABLE T_TransportResult (
  ResultId INTEGER PRIMARY KEY AUTOINCREMENT,
  TransportDate TEXT NOT NULL,
  UserId INTEGER NOT NULL REFERENCES M_User(UserId),
  SourceRequestId INTEGER REFERENCES T_TransportRequest(RequestId),
  KokuhorenClaimFlag INTEGER NOT NULL DEFAULT 0,
  -- 当時の値のスナップショット（後日マスタが変わっても過去実績が変化しないように保持）
  SnapshotCareLevel TEXT,
  SnapshotBenefitRate REAL,
  Remarks TEXT,
  CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  CreatedBy TEXT,
  UpdatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UpdatedBy TEXT
);
CREATE INDEX IX_Result_Date ON T_TransportResult(TransportDate);

CREATE TABLE T_ResultDestination (
  ResultDestinationId INTEGER PRIMARY KEY AUTOINCREMENT,
  ResultId INTEGER NOT NULL REFERENCES T_TransportResult(ResultId) ON DELETE CASCADE,
  SeqNo INTEGER NOT NULL,
  DestinationId INTEGER NOT NULL REFERENCES M_Destination(DestinationId),
  DepartmentId INTEGER REFERENCES M_Department(DepartmentId),
  TsuuinKaigoKihonFlag INTEGER NOT NULL DEFAULT 0, -- 通院乗降介護基本
  PhysicalCareFlag INTEGER NOT NULL DEFAULT 0,      -- 身体介助
  InHospitalCareFlag INTEGER NOT NULL DEFAULT 0,    -- 院内介助
  AdvancedExpense INTEGER,                           -- 立替費用
  HospitalStaffName TEXT,                            -- 院付担当者
  UNIQUE (ResultId, SeqNo)
);

CREATE TABLE T_ResultLeg (
  ResultLegId INTEGER PRIMARY KEY AUTOINCREMENT,
  ResultDestinationId INTEGER NOT NULL REFERENCES T_ResultDestination(ResultDestinationId) ON DELETE CASCADE,
  LegType INTEGER NOT NULL,             -- 1=往路, 2=復路
  DepartureLocation TEXT,
  DepartureTime TEXT,
  ArrivalLocation TEXT,
  ArrivalTime TEXT,
  TransferTime TEXT,                     -- 回送時刻
  VehicleNo TEXT,                        -- 搬送車号車
  DriverId INTEGER REFERENCES M_Driver(DriverId),
  DistanceKm REAL,
  UNIQUE (ResultDestinationId, LegType)
);
