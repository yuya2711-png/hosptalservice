import { useEffect, useState, type ReactElement } from 'react'
import type { BillingDetailItem, BillingSummaryItem, InvoiceAdjustments } from '@shared/types/entities'

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function yen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`
}

const EMPTY_ADJUSTMENTS_FORM = {
  invoiceNumber: '',
  taxAmount: '0',
  discountAmount: '0',
  taxiTicketOffsetAmount: '0'
}

function InvoicePrintForm(props: {
  userId: number
  yearMonth: string
  onClose: () => void
}): ReactElement {
  const { userId, yearMonth, onClose } = props
  const [form, setForm] = useState(EMPTY_ADJUSTMENTS_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePrint(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const adjustments: InvoiceAdjustments = {
        invoiceNumber: form.invoiceNumber,
        taxAmount: Number(form.taxAmount) || 0,
        discountAmount: Number(form.discountAmount) || 0,
        taxiTicketOffsetAmount: Number(form.taxiTicketOffsetAmount) || 0
      }
      await window.api.print.previewInvoice(yearMonth, userId, adjustments)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: 12, marginTop: 8, background: '#fafafa' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11 }}>売上明細書番号</label>
          <input
            type="text"
            value={form.invoiceNumber}
            onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
            style={{ padding: 4, width: 120 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11 }}>外税</label>
          <input
            type="number"
            value={form.taxAmount}
            onChange={(e) => setForm((p) => ({ ...p, taxAmount: e.target.value }))}
            style={{ padding: 4, width: 90 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11 }}>値引</label>
          <input
            type="number"
            value={form.discountAmount}
            onChange={(e) => setForm((p) => ({ ...p, discountAmount: e.target.value }))}
            style={{ padding: 4, width: 90 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11 }}>タクシー券相殺額</label>
          <input
            type="number"
            value={form.taxiTicketOffsetAmount}
            onChange={(e) => setForm((p) => ({ ...p, taxiTicketOffsetAmount: e.target.value }))}
            style={{ padding: 4, width: 90 }}
          />
        </div>
      </div>
      {error && <p style={{ color: 'red', margin: '0 0 8px' }}>{error}</p>}
      <button onClick={handlePrint} disabled={busy}>
        {busy ? '生成中...' : '請求書を印刷プレビュー'}
      </button>{' '}
      <button onClick={onClose}>閉じる</button>
    </div>
  )
}

export function BillingPage(): ReactElement {
  const [yearMonth, setYearMonth] = useState(currentYearMonth())
  const [items, setItems] = useState<BillingSummaryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)
  const [detail, setDetail] = useState<BillingDetailItem[]>([])
  const [printingUserId, setPrintingUserId] = useState<number | null>(null)

  async function reload(): Promise<void> {
    setLoading(true)
    try {
      const rows = await window.api.billing.getMonthlySummary(yearMonth)
      setItems(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    setExpandedUserId(null)
    setPrintingUserId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonth])

  async function toggleDetail(userId: number): Promise<void> {
    if (expandedUserId === userId) {
      setExpandedUserId(null)
      return
    }
    const rows = await window.api.billing.getUserMonthlyDetail(yearMonth, userId)
    setDetail(rows)
    setExpandedUserId(userId)
  }

  const totalKokuhoren = items.reduce((sum, i) => sum + i.kokuhorenAmount, 0)
  const totalSelfPay = items.reduce((sum, i) => sum + i.selfPayAmount, 0)
  const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0)

  return (
    <div style={{ padding: 16 }}>
      <h2>請求集計</h2>
      <p style={{ color: '#666' }}>
        搬送実績の料金を利用者ごとに月単位で集計します。国保連請求分とそれ以外(自費等)を分けて表示します。
      </p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>対象月</label>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          style={{ padding: 6 }}
        />
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#888' }}>この月の実績はありません。</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6 }}>
                利用者
              </th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: 6 }}>
                件数
              </th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: 6 }}>
                国保連請求分
              </th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: 6 }}>
                自費等
              </th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: 6 }}>
                合計
              </th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 6 }} />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <>
                <tr key={item.userId}>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>{item.userName}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    {item.resultCount}
                  </td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    {yen(item.kokuhorenAmount)}
                  </td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    {yen(item.selfPayAmount)}
                  </td>
                  <td
                    style={{
                      padding: 6,
                      borderBottom: '1px solid #eee',
                      textAlign: 'right',
                      fontWeight: 'bold'
                    }}
                  >
                    {yen(item.totalAmount)}
                  </td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                    <button onClick={() => toggleDetail(item.userId)}>
                      {expandedUserId === item.userId ? '内訳を閉じる' : '内訳'}
                    </button>{' '}
                    <button
                      onClick={() =>
                        setPrintingUserId((prev) => (prev === item.userId ? null : item.userId))
                      }
                    >
                      請求書印刷
                    </button>
                  </td>
                </tr>
                {expandedUserId === item.userId && (
                  <tr key={`${item.userId}-detail`}>
                    <td colSpan={6} style={{ padding: '0 6px 12px 24px', borderBottom: '1px solid #eee' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: 4, color: '#666' }}>搬送日</th>
                            <th style={{ textAlign: 'left', padding: 4, color: '#666' }}>搬送先</th>
                            <th style={{ textAlign: 'left', padding: 4, color: '#666' }}>区分</th>
                            <th style={{ textAlign: 'right', padding: 4, color: '#666' }}>金額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.map((d) => (
                            <tr key={d.resultId}>
                              <td style={{ padding: 4 }}>{d.transportDate}</td>
                              <td style={{ padding: 4 }}>{d.destinationNames.join('、')}</td>
                              <td style={{ padding: 4 }}>
                                {d.kokuhorenClaimFlag ? '国保連請求' : '自費等'}
                              </td>
                              <td style={{ padding: 4, textAlign: 'right' }}>{yen(d.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
                {printingUserId === item.userId && (
                  <tr key={`${item.userId}-print`}>
                    <td colSpan={6} style={{ padding: '0 6px 12px 24px', borderBottom: '1px solid #eee' }}>
                      <InvoicePrintForm
                        userId={item.userId}
                        yearMonth={yearMonth}
                        onClose={() => setPrintingUserId(null)}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ padding: 6, fontWeight: 'bold' }}>合計</td>
              <td style={{ padding: 6, textAlign: 'right', fontWeight: 'bold' }}>
                {items.reduce((sum, i) => sum + i.resultCount, 0)}
              </td>
              <td style={{ padding: 6, textAlign: 'right', fontWeight: 'bold' }}>
                {yen(totalKokuhoren)}
              </td>
              <td style={{ padding: 6, textAlign: 'right', fontWeight: 'bold' }}>
                {yen(totalSelfPay)}
              </td>
              <td style={{ padding: 6, textAlign: 'right', fontWeight: 'bold' }}>
                {yen(totalAmount)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
