import { BrowserWindow, app } from 'electron'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { listRequests } from '../db/repositories/requestRepository'
import type { TransportRequestListItem } from '../../shared/types/entities'

const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土']

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDateJp(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAY_JP[d.getDay()]})`
}

function buildRowHtml(row: TransportRequestListItem): string {
  const marks: string[] = []
  if (row.wheelchairFlag) marks.push('車椅子')
  if (row.specialTransportFlag) marks.push('特別搬送')
  if (row.cancelDate) marks.push('キャンセル')

  return `
    <div class="row${row.cancelDate ? ' cancelled' : ''}">
      <div class="row-left">
        <div class="time">${escapeHtml(row.pickupTime ?? '--:--')}</div>
        <div class="user">${escapeHtml(row.userName)}</div>
        <div class="dest">${escapeHtml(row.destinationNames.join('、') || '(搬送先未設定)')}</div>
        ${marks.length ? `<div class="marks">${marks.map(escapeHtml).join(' / ')}</div>` : ''}
      </div>
      <div class="row-right">
        <div class="leg-line"><span class="leg-label">往路</span>出発 ______:______　到着 ______:______</div>
        <div class="leg-line"><span class="leg-label">復路</span>出発 ______:______　到着 ______:______</div>
        <div class="leg-line">運転手 ________________　距離 ________ km</div>
      </div>
    </div>`
}

// 運転手ごとのページ分割は、現状の搬送依頼(T_TransportRequest)に運転手の
// 事前割当フィールドが無いため未対応。当日の全依頼を時刻順に1枚のシートへ出力し、
// 配車確認と(手書きの)実績記入欄を兼ねる形にしている。
export function buildScheduleHtml(date: string, rows: TransportRequestListItem[]): string {
  const bodyRows = rows.length
    ? rows.map(buildRowHtml).join('\n')
    : '<p class="empty">この日の搬送依頼はありません。</p>'

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Yu Gothic", "Meiryo", sans-serif; font-size: 14pt; color: #000; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 4mm; }
  .meta { font-size: 11pt; color: #333; margin-bottom: 6mm; }
  .row {
    display: flex;
    border: 1px solid #000;
    margin-bottom: 4mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .row-left { width: 45%; padding: 3mm; border-right: 1px solid #000; }
  .row-right { width: 55%; padding: 3mm; min-height: 8mm; }
  .time { font-size: 16pt; font-weight: bold; }
  .user { font-size: 14pt; margin-top: 1mm; }
  .dest { font-size: 12pt; color: #333; margin-top: 1mm; }
  .marks { font-size: 11pt; margin-top: 1mm; }
  .row.cancelled { border-style: dashed; color: #555; }
  .leg-line { font-size: 12pt; margin-bottom: 3mm; }
  .leg-label { display: inline-block; width: 4em; font-weight: bold; }
  .empty { color: #666; }
</style>
</head>
<body>
  <h1>搬送スケジュール表</h1>
  <div class="meta">${escapeHtml(formatDateJp(date))}　対象件数: ${rows.length}件</div>
  ${bodyRows}
</body>
</html>`
}

function getOutputDir(): string {
  const dir = join(app.getPath('temp'), 'kurofune-print')
  mkdirSync(dir, { recursive: true })
  return dir
}

export async function generateDailySchedulePdf(date: string): Promise<string> {
  const rows = listRequests({ dateFrom: date, dateTo: date })
  const html = buildScheduleHtml(date, rows)

  const printWin = new BrowserWindow({ show: false })
  try {
    await printWin.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
    const pdfBuffer = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'none' }
    })

    const outPath = join(getOutputDir(), `schedule_${date}.pdf`)
    writeFileSync(outPath, pdfBuffer)
    return outPath
  } finally {
    printWin.destroy()
  }
}

export async function openPdfPreview(pdfPath: string): Promise<void> {
  const previewWin = new BrowserWindow({ width: 900, height: 1100, title: '印刷プレビュー' })
  await previewWin.loadURL(`file://${pdfPath.replace(/\\/g, '/')}`)
}
