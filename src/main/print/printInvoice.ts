import { BrowserWindow, app } from 'electron'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getInvoiceData } from '../db/repositories/billingRepository'
import { getCurrentOperator } from '../operatorState'
import type { InvoiceAdjustments, InvoiceData, InvoiceLineItem } from '../../shared/types/entities'

const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土']

const ISSUER = {
  name: '特定非営利活動法人くろふね',
  postalCode: '238-0042',
  address: '神奈川県横須賀市汐入町2-10',
  phone: '046-828-4465'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 西暦→令和年に変換する(令和1年=2019年)
function toReiwa(year: number): number {
  return year - 2018
}

function formatDateJp(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_JP[d.getDay()]})`
}

function yen(n: number): string {
  return n.toLocaleString('ja-JP')
}

function lineItemTotal(item: InvoiceLineItem): number {
  return (
    item.transportFee +
    item.baseCareFee +
    item.physicalCareFee +
    item.ancillaryServiceFee +
    item.specialFee +
    item.advancedExpense
  )
}

export function buildInvoiceHtml(data: InvoiceData, adjustments: InvoiceAdjustments): string {
  const [yearStr, monthStr] = data.yearMonth.split('-')
  const targetReiwa = toReiwa(Number(yearStr))
  const targetMonth = Number(monthStr)

  const today = new Date()
  const issueReiwa = toReiwa(today.getFullYear())
  const issueDateJp = `令和${issueReiwa}年${today.getMonth() + 1}月${today.getDate()}日`

  const transportFeeTotal = data.lineItems.reduce((s, i) => s + i.transportFee, 0)
  const baseCareFeeTotal = data.lineItems.reduce((s, i) => s + i.baseCareFee, 0)
  const physicalCareFeeTotal = data.lineItems.reduce((s, i) => s + i.physicalCareFee, 0)
  const ancillaryServiceFeeTotal = data.lineItems.reduce((s, i) => s + i.ancillaryServiceFee, 0)
  const specialFeeTotal = data.lineItems.reduce((s, i) => s + i.specialFee, 0)
  const advancedExpenseTotal = data.lineItems.reduce((s, i) => s + i.advancedExpense, 0)
  const salesTotal =
    transportFeeTotal +
    baseCareFeeTotal +
    physicalCareFeeTotal +
    ancillaryServiceFeeTotal +
    specialFeeTotal +
    advancedExpenseTotal +
    data.cancellationFeeTotal
  const billedAmount =
    salesTotal + adjustments.taxAmount - adjustments.discountAmount - adjustments.taxiTicketOffsetAmount

  const rows = data.lineItems
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(formatDateJp(item.transportDate))}</td>
        <td>${escapeHtml(item.destinationName)}</td>
        <td>${escapeHtml(item.departureLocation ?? '')}</td>
        <td>${escapeHtml(item.departureTime ?? '')}〜${escapeHtml(item.arrivalTime ?? '')}${item.minutes !== null ? `(${item.minutes}分)` : ''}</td>
        <td class="num">${item.transportFee ? yen(item.transportFee) : ''}</td>
        <td class="num">${item.baseCareFee ? yen(item.baseCareFee) : ''}</td>
        <td class="num">${item.physicalCareFee ? yen(item.physicalCareFee) : ''}</td>
        <td class="num">${item.ancillaryServiceFee ? yen(item.ancillaryServiceFee) : ''}</td>
        <td class="num">${item.specialFee ? yen(item.specialFee) : ''}</td>
        <td class="num">${item.advancedExpense ? yen(item.advancedExpense) : ''}</td>
        <td class="num">${yen(lineItemTotal(item))}</td>
      </tr>`
    )
    .join('\n')

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Yu Gothic", "Meiryo", sans-serif; font-size: 10pt; color: #000; margin: 0; }
  .header { display: flex; justify-content: space-between; margin-bottom: 4mm; }
  .issuer { font-size: 9pt; line-height: 1.5; text-align: right; }
  .recipient { font-size: 12pt; }
  h1 { font-size: 15pt; text-align: center; margin: 4mm 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 2mm; font-size: 9pt; }
  th { background: #eee; }
  td.num, th.num { text-align: right; }
  .summary-bar { display: flex; border: 1px solid #000; margin-bottom: 4mm; }
  .summary-cell { flex: 1; border-right: 1px solid #000; padding: 2mm; text-align: center; }
  .summary-cell:last-child { border-right: none; }
  .summary-cell .label { font-size: 8pt; color: #333; }
  .summary-cell .value { font-size: 11pt; font-weight: bold; }
  .summary-cell.highlight { background: #eee; }
</style>
</head>
<body>
  <div class="header">
    <div class="recipient">
      ${data.userPostalCode ? `〒${escapeHtml(data.userPostalCode)}<br/>` : ''}
      ${data.userAddress ? `${escapeHtml(data.userAddress)}<br/>` : ''}
      ${escapeHtml(data.userName)} 様
    </div>
    <div class="issuer">
      発行日: ${issueDateJp}<br/>
      売上明細書番号: ${escapeHtml(adjustments.invoiceNumber)}<br/>
      ${escapeHtml(ISSUER.name)}<br/>
      〒${ISSUER.postalCode} ${ISSUER.address}<br/>
      電話: ${ISSUER.phone}　担当: ${escapeHtml(getCurrentOperator() ?? '')}
    </div>
  </div>

  <h1>令和${targetReiwa}年${targetMonth}月 福祉有償運送サービス請求明細書</h1>

  <table style="margin-bottom: 4mm;">
    <thead>
      <tr>
        <th>No.</th><th>日付</th><th>搬送先</th><th>出発地</th><th>時刻(所要)</th>
        <th class="num">運送サービス</th><th class="num">介護基本</th><th class="num">身体介助</th>
        <th class="num">付帯サービス</th><th class="num">特別自費</th><th class="num">立替費用</th><th class="num">小計</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="12" style="text-align:center;color:#666;">対象月の実績はありません</td></tr>'}
    </tbody>
  </table>

  <div class="summary-bar">
    <div class="summary-cell"><div class="label">運送サービス</div><div class="value">${yen(transportFeeTotal)}</div></div>
    <div class="summary-cell"><div class="label">介護基本</div><div class="value">${yen(baseCareFeeTotal)}</div></div>
    <div class="summary-cell"><div class="label">身体介助</div><div class="value">${yen(physicalCareFeeTotal)}</div></div>
    <div class="summary-cell"><div class="label">付帯サービス</div><div class="value">${yen(ancillaryServiceFeeTotal)}</div></div>
    <div class="summary-cell"><div class="label">特別自費</div><div class="value">${yen(specialFeeTotal)}</div></div>
    <div class="summary-cell"><div class="label">立替費用</div><div class="value">${yen(advancedExpenseTotal)}</div></div>
    <div class="summary-cell"><div class="label">キャンセル料金</div><div class="value">${yen(data.cancellationFeeTotal)}</div></div>
    <div class="summary-cell highlight"><div class="label">売上合計</div><div class="value">${yen(salesTotal)}</div></div>
    <div class="summary-cell"><div class="label">外税</div><div class="value">${yen(adjustments.taxAmount)}</div></div>
    <div class="summary-cell"><div class="label">値引</div><div class="value">${yen(adjustments.discountAmount)}</div></div>
    <div class="summary-cell"><div class="label">タクシー券相殺額</div><div class="value">${yen(adjustments.taxiTicketOffsetAmount)}</div></div>
    <div class="summary-cell highlight"><div class="label">ご請求金額</div><div class="value">${yen(billedAmount)}</div></div>
  </div>
</body>
</html>`
}

function getOutputDir(): string {
  const dir = join(app.getPath('temp'), 'kurofune-print')
  mkdirSync(dir, { recursive: true })
  return dir
}

export async function generateInvoicePdf(
  yearMonth: string,
  userId: number,
  adjustments: InvoiceAdjustments
): Promise<string> {
  const data = getInvoiceData(yearMonth, userId)
  const html = buildInvoiceHtml(data, adjustments)

  const printWin = new BrowserWindow({ show: false })
  try {
    await printWin.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
    const pdfBuffer = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'none' }
    })

    const outPath = join(getOutputDir(), `invoice_${yearMonth}_user${userId}.pdf`)
    writeFileSync(outPath, pdfBuffer)
    return outPath
  } finally {
    printWin.destroy()
  }
}
