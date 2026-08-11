import { readFileSync } from 'node:fs'
import iconv from 'iconv-lite'

// カイポケなど旧システムからのエクスポートはShift_JISが標準のため、それを前提に読み込む。
export function readCsvFile(filePath: string): string[][] {
  const buffer = readFileSync(filePath)
  const text = iconv.decode(buffer, 'Shift_JIS')
  return parseCsv(text)
}

// 簡易的なRFC4180準拠CSVパーサ。ダブルクオートで囲んだフィールド内のカンマ・改行・
// エスケープされたダブルクオート("")に対応する。
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const len = text.length

  function endField(): void {
    row.push(field)
    field = ''
  }
  function endRow(): void {
    endField()
    rows.push(row)
    row = []
  }

  while (i < len) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      endField()
      i++
      continue
    }
    if (ch === '\r') {
      i++
      continue
    }
    if (ch === '\n') {
      endRow()
      i++
      continue
    }
    field += ch
    i++
  }
  // 末尾に改行がない最終行も取りこぼさない
  if (field !== '' || row.length > 0) endRow()

  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}
