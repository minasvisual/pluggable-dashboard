import { shallowMount, createLocalVue } from '@vue/test-utils'
import CoreuiVue from '@coreui/vue'
import Vuex from 'vuex'
import TableRemote from '@/views/crud/table-types/TableRemote.vue'

const localVue = createLocalVue()
localVue.use(CoreuiVue)
localVue.use(Vuex)

const makeStore = () => new Vuex.Store({
  state: { loading: { table: false } },
  mutations: {
    setLoader (state, [key, val]) { state.loading[key] = val }
  }
})

const busMock = () => ({ $on: jest.fn(), $off: jest.fn(), $emit: jest.fn() })

const schema = {
  title: 'Users',
  domain: 'users',
  primaryKey: 'id',
  properties: [
    { name: 'id', label: 'ID', config: { grid: true, sort: 0 } },
    { name: 'name', label: 'Name', type: 'text', config: { grid: true } }
  ],
  api: {
    rootApi: 'https://api.example.com/users',
    pagination: { pageField: 'page', limitField: 'limit' },
    params: { limit: 15 }
  }
}

const makeResource = (count = 3) => ({
  rows: Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `User ${i + 1}` })),
  total: count * 10
})

const mount = (propsData = {}) => shallowMount(TableRemote, {
  localVue,
  store: makeStore(),
  propsData: { schema, resource: makeResource(), ...propsData },
  mocks: { $bus: busMock() }
})

describe('TableRemote.vue', () => {
  describe('component', () => {
    it('has name "TableServer2"', () => {
      expect(TableRemote.name).toBe('TableServer2')
    })

    it('is a Vue instance', () => {
      expect(mount().isVueInstance()).toBe(true)
    })

    it('perPage defaults to 5', () => {
      expect(TableRemote.data().perPage).toBe(5)
    })

    it('currentPage defaults to 1', () => {
      expect(TableRemote.data().currentPage).toBe(1)
    })

    it('showPerPage contains standard options', () => {
      expect(TableRemote.data().showPerPage).toEqual([5, 15, 25, 50, 100])
    })
  })

  describe('computed: grid', () => {
    it('returns rows from resource prop', () => {
      const resource = makeResource(5)
      const wrapper = mount({ resource })
      expect(wrapper.vm.grid).toEqual(resource.rows)
      expect(wrapper.vm.grid).toHaveLength(5)
    })

    it('returns empty array when resource has no rows', () => {
      const wrapper = mount({ resource: {} })
      expect(wrapper.vm.grid).toEqual([])
    })

    it('returns empty array for null resource', () => {
      const wrapper = mount({ resource: null })
      expect(wrapper.vm.grid).toEqual([])
    })

    it('does NOT set perPage as a side effect (pure computed)', () => {
      const wrapper = mount({ resource: makeResource(10) })
      const initialPerPage = wrapper.vm.perPage
      // Access grid multiple times — perPage must not change via side effect
      wrapper.vm.grid
      wrapper.vm.grid
      expect(wrapper.vm.perPage).toBe(initialPerPage)
    })
  })

  describe('computed: totals', () => {
    it('returns total from resource', () => {
      const wrapper = mount({ resource: { rows: [], total: 99 } })
      expect(wrapper.vm.totals).toBe(99)
    })

    it('returns 0 when resource has no total', () => {
      const wrapper = mount({ resource: {} })
      expect(wrapper.vm.totals).toBe(0)
    })
  })

  describe('watcher: resource → perPage', () => {
    it('sets perPage on mount (immediate) from resource rows count', () => {
      const wrapper = mount({ resource: { rows: new Array(15).fill({}), total: 100 } })
      expect(wrapper.vm.perPage).toBe(15)
    })

    it('updates perPage when resource prop changes', async () => {
      const wrapper = mount({ resource: makeResource(5) })
      expect(wrapper.vm.perPage).toBe(5)
      await wrapper.setProps({ resource: { rows: new Array(15).fill({}), total: 100 } })
      expect(wrapper.vm.perPage).toBe(15)
    })

    it('does NOT decrease perPage when last page has fewer rows', async () => {
      const wrapper = mount({ resource: { rows: new Array(15).fill({}), total: 100 } })
      expect(wrapper.vm.perPage).toBe(15)
      // Last page with only 3 rows — perPage should stay at 15
      await wrapper.setProps({ resource: { rows: new Array(3).fill({}), total: 100 } })
      expect(wrapper.vm.perPage).toBe(15)
    })

    it('does NOT set perPage to 0 for empty resource', () => {
      const wrapper = mount({ resource: makeResource(10) })
      expect(wrapper.vm.perPage).toBe(10)
      wrapper.setProps({ resource: { rows: [], total: 0 } })
      expect(wrapper.vm.perPage).toBe(10)
    })
  })

  describe('onPageChange() — immediate (no debounce)', () => {
    it('emits fetchData with page queryInfo', () => {
      const wrapper = mount()
      wrapper.vm.onPageChange(3)
      expect(wrapper.emitted('fetchData')).toBeTruthy()
      expect(wrapper.emitted('fetchData')[0][0]).toEqual({ type: 'page', page: 3 })
    })

    it('updates internal queryInfo', () => {
      const wrapper = mount()
      wrapper.vm.onPageChange(2)
      expect(wrapper.vm.queryInfo).toEqual({ type: 'page', page: 2 })
    })

    it('emits synchronously without delay', () => {
      jest.useFakeTimers()
      const wrapper = mount()
      wrapper.vm.onPageChange(4)
      // Must emit without waiting for any timer
      expect(wrapper.emitted('fetchData')).toBeTruthy()
      jest.useRealTimers()
    })
  })

  describe('fetchQueryInfo()', () => {
    it('builds sort queryInfo with ascending order', () => {
      const wrapper = mount()
      wrapper.vm.fetchQueryInfo('sort', { column: 'name', asc: true })
      expect(wrapper.vm.queryInfo).toMatchObject({
        type: 'sort',
        sort: { prop: 'name', order: 'ascending' }
      })
    })

    it('maps asc=false to descending order', () => {
      const wrapper = mount()
      wrapper.vm.fetchQueryInfo('sort', { column: 'name', asc: false })
      expect(wrapper.vm.queryInfo.sort.order).toBe('descending')
    })

    it('builds filter queryInfo from column values', () => {
      const wrapper = mount()
      wrapper.vm.fetchQueryInfo('filter', { name: 'Alice', status: 'active' })
      expect(wrapper.vm.queryInfo.filters).toEqual(
        expect.arrayContaining([
          { prop: 'name', value: 'Alice' },
          { prop: 'status', value: 'active' }
        ])
      )
    })

    it('builds pageSize queryInfo', () => {
      const wrapper = mount()
      wrapper.vm.fetchQueryInfo('pageSize', 25)
      expect(wrapper.vm.queryInfo).toMatchObject({ type: 'pageSize', pageSize: 25 })
    })

    it('calls the debounced fetchData', () => {
      const wrapper = mount()
      // fetchQueryInfo calls this.fetchData which emits after debounce
      // We just verify queryInfo is set correctly (emit is debounced)
      wrapper.vm.fetchQueryInfo('pageSize', 50)
      expect(wrapper.vm.queryInfo.pageSize).toBe(50)
    })
  })

  describe('limit / sort / filter / page interplay', () => {
    it('onPageSize sets perPage (can go down) and requests page 1', () => {
      const wrapper = mount({ resource: makeResource(5) })
      wrapper.vm.perPage = 25
      wrapper.vm.currentPage = 4
      wrapper.vm.onPageSize('5')
      expect(wrapper.vm.perPage).toBe(5)
      expect(wrapper.vm.currentPage).toBe(1)
      expect(wrapper.vm.queryInfo).toEqual({ type: 'pageSize', pageSize: 5, page: 1 })
    })

    it('pages are calculated from the chosen limit', () => {
      const wrapper = mount({ resource: { rows: new Array(25).fill({}), total: 100 } })
      expect(wrapper.vm.calcPages(wrapper.vm.totals, wrapper.vm.perPage)).toBe(4)
      wrapper.vm.onPageSize(5)
      expect(wrapper.vm.calcPages(wrapper.vm.totals, wrapper.vm.perPage)).toBe(20)
    })

    it('sort goes back to page 1', () => {
      const wrapper = mount()
      wrapper.vm.currentPage = 3
      wrapper.vm.fetchQueryInfo('sort', { column: 'name', asc: true })
      expect(wrapper.vm.queryInfo.page).toBe(1)
      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('filter goes back to page 1', () => {
      const wrapper = mount()
      wrapper.vm.currentPage = 3
      wrapper.vm.fetchQueryInfo('filter', { name: 'Alice' })
      expect(wrapper.vm.queryInfo.page).toBe(1)
      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('debounced fetchData emits the queryInfo (sort)', async () => {
      const wrapper = mount()
      wrapper.vm.fetchQueryInfo('sort', { column: 'name', asc: false })
      // lodash debounce is created at import time, so fake timers do not apply: wait the real 700ms
      await new Promise(resolve => setTimeout(resolve, 900))
      const emitted = wrapper.emitted('fetchData')
      expect(emitted[emitted.length - 1][0]).toMatchObject({ type: 'sort', sort: { prop: 'name', order: 'descending' }, page: 1 })
    })

    it('validateQueryInfo accepts every query built by the table', () => {
      const wrapper = mount()
      wrapper.vm.fetchQueryInfo('filter', { name: 'a' })
      expect(wrapper.vm.validateQueryInfo(wrapper.vm.queryInfo)).toBe(true)
      wrapper.vm.fetchQueryInfo('sort', { column: 'name', asc: true })
      expect(wrapper.vm.validateQueryInfo(wrapper.vm.queryInfo)).toBe(true)
      wrapper.vm.fetchQueryInfo('pageSize', 15)
      expect(wrapper.vm.validateQueryInfo(wrapper.vm.queryInfo)).toBe(true)
      expect(wrapper.vm.validateQueryInfo({ type: 'page', page: 2 })).toBe(true)
      expect(wrapper.vm.validateQueryInfo({ type: 'nope' })).toBe(false)
    })
  })

  describe('action events', () => {
    it('onCreate emits actions:create with empty object', () => {
      const wrapper = mount()
      wrapper.vm.onCreate()
      expect(wrapper.emitted('actions:create')).toBeTruthy()
      expect(wrapper.emitted('actions:create')[0][0]).toEqual({})
    })

    it('onEdit emits actions:edit with row data', () => {
      const wrapper = mount()
      const row = { id: 1, name: 'Alice' }
      wrapper.vm.onEdit(row)
      expect(wrapper.emitted('actions:edit')).toBeTruthy()
      expect(wrapper.emitted('actions:edit')[0][0]).toEqual(row)
    })
  })

  describe('calcPages()', () => {
    it.each([
      [100, 15, 7],
      [15,  15, 1],
      [16,  15, 2],
      [0,   15, 1],
      [30,  10, 3],
      [31,  15, 3],
    ])('calcPages(%d total, %d perPage) = %d pages', (total, perPage, expected) => {
      const wrapper = mount()
      expect(wrapper.vm.calcPages(total, perPage)).toBe(expected)
    })
  })

  describe('selection', () => {
    it('initializes with empty selectedRow', () => {
      const wrapper = mount()
      expect(wrapper.vm.selectedRow).toEqual([])
    })

    it('selectionChange adds item to selection', () => {
      const wrapper = mount()
      const item = { id: 1, name: 'Alice' }
      wrapper.vm.selectionChange(item)
      expect(wrapper.vm.selectedRow).toContainEqual(item)
    })

    it('selectionChange removes item if already selected', () => {
      const wrapper = mount()
      const item = { id: 1, name: 'Alice' }
      wrapper.vm.selectedRow = [item]
      wrapper.vm.selectionChange(item)
      expect(wrapper.vm.selectedRow).toHaveLength(0)
    })

    it('isSelected returns true for a selected item', () => {
      const wrapper = mount()
      const item = { id: 2, name: 'Bob' }
      wrapper.vm.selectedRow = [item]
      expect(wrapper.vm.isSelected(item)).toBe(true)
    })

    it('isSelected returns false for an unselected item', () => {
      const wrapper = mount()
      expect(wrapper.vm.isSelected({ id: 99 })).toBe(false)
    })
  })

  describe('hasPagination / hasPageSize', () => {
    it('hasPagination is true when schema has pagination.pageField', () => {
      const wrapper = mount()
      expect(wrapper.vm.hasPagination).toBe(true)
    })

    it('hasPagination is false when schema has no pagination', () => {
      const wrapper = mount({ schema: { ...schema, api: { rootApi: 'url' } } })
      expect(wrapper.vm.hasPagination).toBe(false)
    })

    it('hasPageSize is true when schema has pagination.limitField', () => {
      const wrapper = mount()
      expect(wrapper.vm.hasPageSize).toBe(true)
    })
  })
})
