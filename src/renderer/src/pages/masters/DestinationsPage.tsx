import type { ReactElement } from 'react'
import { SimpleMasterList } from '@renderer/components/SimpleMasterList'
import type { Destination, NewDestination } from '@shared/types/entities'

export function DestinationsPage(): ReactElement {
  return (
    <SimpleMasterList<Destination, NewDestination>
      title="搬送先マスタ"
      fields={[
        { key: 'name', label: '搬送先名', type: 'text', required: true },
        { key: 'nameKana', label: 'カナ', type: 'text' },
        { key: 'postalCode', label: '郵便番号', type: 'text' },
        { key: 'address', label: '住所', type: 'text' },
        { key: 'phoneNumber', label: '電話番号', type: 'text' },
        { key: 'remarks', label: '備考', type: 'text' }
      ]}
      listColumns={[
        { key: 'name', label: '搬送先名' },
        { key: 'nameKana', label: 'カナ' },
        { key: 'phoneNumber', label: '電話番号' }
      ]}
      searchableKeys={['name', 'nameKana']}
      api={window.api.destinations}
      getId={(d) => d.destinationId}
      emptyItem={{
        name: '',
        nameKana: null,
        postalCode: null,
        address: null,
        phoneNumber: null,
        remarks: null
      }}
    />
  )
}
