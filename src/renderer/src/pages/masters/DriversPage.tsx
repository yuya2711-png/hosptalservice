import type { ReactElement } from 'react'
import { SimpleMasterList } from '@renderer/components/SimpleMasterList'
import type { Driver, NewDriver } from '@shared/types/entities'

export function DriversPage(): ReactElement {
  return (
    <SimpleMasterList<Driver, NewDriver>
      title="運転手マスタ"
      fields={[
        { key: 'name', label: '氏名', type: 'text', required: true },
        { key: 'nameKana', label: 'カナ', type: 'text' },
        { key: 'phoneNumber', label: '電話番号', type: 'text' },
        { key: 'remarks', label: '備考', type: 'text' }
      ]}
      listColumns={[
        { key: 'name', label: '氏名' },
        { key: 'nameKana', label: 'カナ' },
        { key: 'phoneNumber', label: '電話番号' }
      ]}
      searchableKeys={['name', 'nameKana']}
      api={window.api.drivers}
      getId={(d) => d.driverId}
      emptyItem={{ name: '', nameKana: null, phoneNumber: null, remarks: null }}
    />
  )
}
