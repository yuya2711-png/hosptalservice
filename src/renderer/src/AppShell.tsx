import { useEffect, useState, type ReactElement } from 'react'
import { DepartmentsPage } from '@renderer/pages/masters/DepartmentsPage'
import { DestinationsPage } from '@renderer/pages/masters/DestinationsPage'
import { DriversPage } from '@renderer/pages/masters/DriversPage'
import { UsersPage } from '@renderer/pages/masters/UsersPage'
import { ServicePricesPage } from '@renderer/pages/masters/ServicePricesPage'
import { SpecialTransportRatesPage } from '@renderer/pages/masters/SpecialTransportRatesPage'
import { RequestsPage, type OpenRequestRequest } from '@renderer/pages/requests/RequestsPage'
import { CalendarPage } from '@renderer/pages/calendar/CalendarPage'
import { ResultsPage } from '@renderer/pages/results/ResultsPage'
import { BillingPage } from '@renderer/pages/billing/BillingPage'
import { PrintPage } from '@renderer/pages/print/PrintPage'
import { SystemStatusPage } from '@renderer/pages/SystemStatusPage'
import { ImportPage } from '@renderer/pages/ImportPage'

type NavKey =
  | 'masters-users'
  | 'masters-destinations'
  | 'masters-drivers'
  | 'masters-departments'
  | 'masters-service-prices'
  | 'masters-special-transport-rates'
  | 'requests'
  | 'calendar'
  | 'results'
  | 'billing'
  | 'print'
  | 'import'
  | 'system'

const NAV_ITEMS: { key: NavKey; label: string; group: string; implemented: boolean }[] = [
  { key: 'masters-users', label: '利用者', group: 'マスタ管理', implemented: true },
  { key: 'masters-destinations', label: '搬送先', group: 'マスタ管理', implemented: true },
  { key: 'masters-drivers', label: '運転手', group: 'マスタ管理', implemented: true },
  { key: 'masters-departments', label: '診療科', group: 'マスタ管理', implemented: true },
  {
    key: 'masters-service-prices',
    label: 'サービス単価',
    group: 'マスタ管理',
    implemented: true
  },
  {
    key: 'masters-special-transport-rates',
    label: '特別搬送料金',
    group: 'マスタ管理',
    implemented: true
  },
  { key: 'requests', label: '搬送依頼', group: '業務', implemented: true },
  { key: 'calendar', label: '搬送カレンダー', group: '業務', implemented: true },
  { key: 'results', label: '搬送実績', group: '業務', implemented: true },
  { key: 'billing', label: '請求集計', group: '業務', implemented: true },
  { key: 'print', label: '印刷', group: '業務', implemented: true },
  { key: 'import', label: 'CSVインポート', group: 'その他', implemented: true },
  { key: 'system', label: 'システム情報', group: 'その他', implemented: true }
]

export function AppShell(): ReactElement {
  const [active, setActive] = useState<NavKey>('masters-users')
  const [openRequest, setOpenRequest] = useState<OpenRequestRequest | undefined>(undefined)
  const [operator, setOperator] = useState<string | null>(null)

  function openRequestInRequestsPage(id: number | 'new', defaultTransportDate?: string): void {
    setOpenRequest((prev) => ({ id, defaultTransportDate, token: (prev?.token ?? 0) + 1 }))
    setActive('requests')
  }

  async function changeOperator(): Promise<void> {
    const input = window.prompt('操作者名を入力してください(入力欄・変更履歴に記録されます)', operator ?? '')
    if (input === null) return
    await window.api.operator.set(input)
    setOperator(input.trim() || null)
  }

  useEffect(() => {
    async function init(): Promise<void> {
      const name = await window.api.operator.get()
      setOperator(name)
      if (!name) await changeOperator()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const groups = Array.from(new Set(NAV_ITEMS.map((i) => i.group)))

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <nav
        style={{
          width: 180,
          borderRight: '1px solid #ccc',
          padding: 12,
          overflowY: 'auto',
          flexShrink: 0
        }}
      >
        <h1 style={{ fontSize: 16 }}>搬送管理アプリ</h1>
        <div
          style={{
            fontSize: 12,
            color: '#666',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>操作者: {operator ?? '未設定'}</span>
          <button onClick={changeOperator} style={{ fontSize: 11, padding: '2px 6px' }}>
            変更
          </button>
        </div>
        {groups.map((group) => (
          <div key={group} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{group}</div>
            {NAV_ITEMS.filter((i) => i.group === group).map((item) => (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                disabled={!item.implemented}
                title={item.implemented ? undefined : '準備中'}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: 8,
                  marginBottom: 2,
                  background: active === item.key ? '#eef' : 'transparent',
                  border: 'none',
                  cursor: item.implemented ? 'pointer' : 'not-allowed',
                  color: item.implemented ? 'inherit' : '#aaa'
                }}
              >
                {item.label}
                {!item.implemented && '（準備中）'}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {active === 'masters-users' && <UsersPage />}
        {active === 'masters-destinations' && <DestinationsPage />}
        {active === 'masters-drivers' && <DriversPage />}
        {active === 'masters-departments' && <DepartmentsPage />}
        {active === 'masters-service-prices' && <ServicePricesPage />}
        {active === 'masters-special-transport-rates' && <SpecialTransportRatesPage />}
        {active === 'requests' && <RequestsPage openRequest={openRequest} />}
        {active === 'calendar' && <CalendarPage onOpenRequest={openRequestInRequestsPage} />}
        {active === 'results' && <ResultsPage />}
        {active === 'billing' && <BillingPage />}
        {active === 'print' && <PrintPage />}
        {active === 'import' && <ImportPage />}
        {active === 'system' && <SystemStatusPage />}
      </main>
    </div>
  )
}
