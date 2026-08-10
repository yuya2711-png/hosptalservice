import type { ReactElement } from 'react'
import { SimpleMasterList } from '@renderer/components/SimpleMasterList'
import type { Department, NewDepartment } from '@shared/types/entities'

export function DepartmentsPage(): ReactElement {
  return (
    <SimpleMasterList<Department, NewDepartment>
      title="診療科マスタ"
      fields={[
        { key: 'name', label: '診療科名', type: 'text', required: true },
        { key: 'sortOrder', label: '表示順', type: 'number' }
      ]}
      listColumns={[
        { key: 'name', label: '診療科名' },
        { key: 'sortOrder', label: '表示順' }
      ]}
      searchableKeys={['name']}
      api={window.api.departments}
      getId={(d) => d.departmentId}
      emptyItem={{ name: '', sortOrder: null }}
    />
  )
}
