import { useCallback, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import type { TransportRequestListItem } from '@shared/types/entities'

export function CalendarPage(props: {
  onOpenRequest: (id: number | 'new', defaultTransportDate?: string) => void
}): ReactElement {
  const { onOpenRequest } = props
  const [requests, setRequests] = useState<TransportRequestListItem[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const rangeRef = useRef<{ start: string; end: string } | null>(null)

  const reloadRange = useCallback(async (start: string, end: string) => {
    rangeRef.current = { start, end }
    const rows = await window.api.requests.list({ dateFrom: start, dateTo: end })
    setRequests(rows)
  }, [])

  const events: EventInput[] = requests.map((r) => ({
    id: String(r.requestId),
    title: `${r.cancelDate ? '✕' : '●'} ${r.pickupTime ?? ''} ${r.userName}`.trim(),
    start: r.transportDate,
    allDay: true,
    backgroundColor: r.cancelDate ? '#fde2e2' : r.isRecurring ? '#e0f0ff' : '#e6f4ea',
    borderColor: r.cancelDate ? '#c0392b' : r.isRecurring ? '#2f6fab' : '#2e7d46',
    textColor: r.cancelDate ? '#c0392b' : r.isRecurring ? '#2f6fab' : '#1e5631'
  }))

  if (selectedDate) {
    return (
      <DayView
        date={selectedDate}
        requests={requests.filter((r) => r.transportDate === selectedDate)}
        onBack={() => setSelectedDate(null)}
        onOpenRequest={onOpenRequest}
      />
    )
  }

  return (
    <div style={{ padding: 16, height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      <h2>搬送カレンダー</h2>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#555' }}>
        <span style={{ marginRight: 12 }}>● 予定</span>
        <span style={{ marginRight: 12, color: '#2f6fab' }}>● 定期搬送</span>
        <span style={{ color: '#c0392b' }}>✕ キャンセル</span>
        　日付をクリックすると当日の一覧を表示します
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="ja"
        height="auto"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        buttonText={{ today: '今日' }}
        events={events}
        dateClick={(arg) => setSelectedDate(arg.dateStr)}
        datesSet={(arg) => {
          const start = formatDate(arg.view.activeStart)
          const end = formatDate(arg.view.activeEnd)
          if (rangeRef.current?.start !== start || rangeRef.current?.end !== end) {
            reloadRange(start, end)
          }
        }}
      />
    </div>
  )
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function DayView(props: {
  date: string
  requests: TransportRequestListItem[]
  onBack: () => void
  onOpenRequest: (id: number | 'new', defaultTransportDate?: string) => void
}): ReactElement {
  const { date, requests, onBack, onOpenRequest } = props
  const sorted = [...requests].sort((a, b) => (a.pickupTime ?? '').localeCompare(b.pickupTime ?? ''))

  return (
    <div style={{ padding: 16, height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      <button onClick={onBack} style={{ marginBottom: 12 }}>
        ← 月表示に戻る
      </button>
      <h2>{date} の搬送依頼</h2>
      <button onClick={() => onOpenRequest('new', date)} style={{ marginBottom: 12 }}>
        + この日に新規登録
      </button>

      {sorted.length === 0 ? (
        <p style={{ color: '#888' }}>この日の搬送依頼はありません。</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={cellHeaderStyle}>時刻</th>
              <th style={cellHeaderStyle}>利用者</th>
              <th style={cellHeaderStyle}>搬送先</th>
              <th style={cellHeaderStyle}>状態</th>
              <th style={cellHeaderStyle}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.requestId}>
                <td style={cellStyle}>{r.pickupTime ?? '未設定'}</td>
                <td style={cellStyle}>{r.userName}</td>
                <td style={cellStyle}>{r.destinationNames.join('、') || '(未設定)'}</td>
                <td style={cellStyle}>
                  {r.cancelDate ? (
                    <span style={{ color: '#c0392b' }}>✕ キャンセル</span>
                  ) : (
                    <span>● 予定</span>
                  )}
                  {r.isRecurring && <span title="定期搬送"> 🔁</span>}
                </td>
                <td style={cellStyle}>
                  <button onClick={() => onOpenRequest(r.requestId)}>編集する</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const cellHeaderStyle: CSSProperties = {
  textAlign: 'left',
  borderBottom: '1px solid #ccc',
  padding: 6
}
const cellStyle: CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: 6
}
