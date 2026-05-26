import { shallowMount, createLocalVue } from '@vue/test-utils'
import CoreuiVue from '@coreui/vue'
import Vuex from 'vuex'
import TableLocale from '@/views/crud/table-types/TableLocale.vue'

const localVue = createLocalVue()
localVue.use(CoreuiVue)
localVue.use(Vuex)

const makeStore = () => new Vuex.Store({
  state: { loading: {} },
  mutations: {
    setLoader (state, [key, val]) { state.loading[key] = val }
  }
})

const schema = {
  title: 'Products',
  domain: 'products',
  primaryKey: 'id',
  properties: [
    { name: 'id',    label: 'ID',    config: { grid: true, sort: 0 } },
    { name: 'title', label: 'Title', type: 'text', config: { grid: true } }
  ],
  api: {}
}

const rows = [
  { id: 1, title: 'Product A' },
  { id: 2, title: 'Product B' },
  { id: 3, title: 'Product C' }
]

const mount = (propsData = {}) => shallowMount(TableLocale, {
  localVue,
  store: makeStore(),
  propsData: { schema, resource: rows, ...propsData }
})

describe('TableLocale.vue', () => {
  describe('component', () => {
    it('has name "TableLocale"', () => {
      expect(TableLocale.name).toBe('TableLocale')
    })

    it('is a Vue instance', () => {
      expect(mount().isVueInstance()).toBe(true)
    })

    it('perPage defaults to 5', () => {
      expect(TableLocale.data().perPage).toBe(5)
    })

    it('showPerPage contains standard options', () => {
      expect(TableLocale.data().showPerPage).toEqual([5, 15, 25, 50, 100])
    })
  })

  describe('computed: data', () => {
    it('wraps resource array in {rows, total}', () => {
      const wrapper = mount()
      expect(wrapper.vm.data).toEqual({ rows, total: 3 })
    })

    it('total equals array length', () => {
      const wrapper = mount({ resource: [{ id: 1 }, { id: 2 }] })
      expect(wrapper.vm.data.total).toBe(2)
    })

    it('handles empty array', () => {
      const wrapper = mount({ resource: [] })
      expect(wrapper.vm.data).toEqual({ rows: [], total: 0 })
    })

    it('handles null resource gracefully', () => {
      const wrapper = mount({ resource: null })
      expect(wrapper.vm.data.total).toBe(0)
      expect(wrapper.vm.data.rows).toEqual([])
    })
  })

  describe('computed: titles', () => {
    it('includes columns with config.grid=true', () => {
      const wrapper = mount()
      const keys = wrapper.vm.titles.map(t => t.key)
      expect(keys).toContain('id')
      expect(keys).toContain('title')
    })

    it('always appends a "selected" column', () => {
      const wrapper = mount()
      const keys = wrapper.vm.titles.map(t => t.key)
      expect(keys).toContain('selected')
    })

    it('always appends an "actions" column', () => {
      const wrapper = mount()
      const keys = wrapper.vm.titles.map(t => t.key)
      expect(keys).toContain('actions')
    })

    it('excludes properties without config.grid', () => {
      const schemaWithHidden = {
        ...schema,
        properties: [
          { name: 'id',     config: { grid: true } },
          { name: 'hidden', config: { grid: false } }
        ]
      }
      const wrapper = mount({ schema: schemaWithHidden })
      const keys = wrapper.vm.titles.map(t => t.key)
      expect(keys).not.toContain('hidden')
    })

    it('returns base columns when schema has no properties', () => {
      const { properties: _, ...schemaNoProps } = schema
      const wrapper = mount({ schema: schemaNoProps })
      expect(wrapper.vm.titles).toEqual([])
    })
  })

  describe('renderComponent lifecycle', () => {
    it('starts as false (in initial data)', () => {
      expect(TableLocale.data().renderComponent).toBe(false)
    })

    it('is true after mounted()', () => {
      const wrapper = mount()
      expect(wrapper.vm.renderComponent).toBe(true)
    })
  })

  describe('action events', () => {
    it('onCreate emits actions:create with empty payload', () => {
      const wrapper = mount()
      wrapper.vm.onCreate()
      expect(wrapper.emitted('actions:create')).toBeTruthy()
      expect(wrapper.emitted('actions:create')[0][0]).toEqual({})
    })

    it('onEdit emits actions:edit with the row', () => {
      const wrapper = mount()
      wrapper.vm.onEdit(rows[1])
      expect(wrapper.emitted('actions:edit')).toBeTruthy()
      expect(wrapper.emitted('actions:edit')[0][0]).toEqual(rows[1])
    })
  })

  describe('selection', () => {
    it('initializes with empty selectedRow', () => {
      const wrapper = mount()
      expect(wrapper.vm.selectedRow).toEqual([])
    })

    it('selectionChange adds item to selection', () => {
      const wrapper = mount()
      wrapper.vm.selectionChange(rows[0])
      expect(wrapper.vm.selectedRow).toContainEqual(rows[0])
    })

    it('selectionChange removes item if already selected', () => {
      const wrapper = mount()
      wrapper.vm.selectedRow = [rows[0]]
      wrapper.vm.selectionChange(rows[0])
      expect(wrapper.vm.selectedRow).toHaveLength(0)
    })

    it('selectionAll selects all rows', () => {
      const wrapper = mount()
      wrapper.vm.selectionAll()
      expect(wrapper.vm.selectedRow).toHaveLength(rows.length)
    })

    it('selectionAll deselects all when everything is already selected', () => {
      const wrapper = mount()
      wrapper.vm.selectedRow = [...rows]
      wrapper.vm.selectionAll()
      expect(wrapper.vm.selectedRow).toHaveLength(0)
    })

    it('isSelected returns true for a selected item', () => {
      const wrapper = mount()
      wrapper.vm.selectedRow = [rows[0]]
      expect(wrapper.vm.isSelected(rows[0])).toBe(true)
    })

    it('isSelected returns false for an unselected item', () => {
      const wrapper = mount()
      expect(wrapper.vm.isSelected(rows[0])).toBe(false)
    })
  })

  describe('forceReload()', () => {
    it('sets renderComponent=false then restores to true', async () => {
      const wrapper = mount()
      wrapper.vm.forceReload()
      expect(wrapper.vm.renderComponent).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.renderComponent).toBe(true)
    })
  })

  describe('pagination config', () => {
    it('disables pagination when schema.pagination is falsy', () => {
      const wrapper = mount({ schema: { ...schema, pagination: false } })
      expect(wrapper.vm.paginationData).toBe(false)
    })

    it('disables pagination when schema.pagination is not set', () => {
      const wrapper = mount()
      expect(wrapper.vm.paginationData).toBe(false)
    })

    it('uses default paginationData when schema.pagination is truthy', () => {
      const wrapper = mount({ schema: { ...schema, pagination: true } })
      expect(wrapper.vm.paginationData).toEqual({ align: 'center', size: 'sm' })
    })
  })
})
