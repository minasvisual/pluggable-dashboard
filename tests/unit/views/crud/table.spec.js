import { shallowMount, createLocalVue } from '@vue/test-utils'
import CoreuiVue from '@coreui/vue'
import Vuex from 'vuex'
import Table from '@/views/crud/table.vue'

jest.mock('@/services/models', () => ({
  getData: jest.fn().mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }], total: 2 })
}))

const localVue = createLocalVue()
localVue.use(CoreuiVue)
localVue.use(Vuex)

const makeStore = () => new Vuex.Store({
  state: { loading: {}, currentProject: {}, auth: {}, crud: {}, schemas: {} },
  mutations: {
    set (state, [key, val]) { state[key] = val },
    setLoader (state, [key, val]) { state.loading[key] = val },
    setSchema (state, [key, val]) { state.schemas[key] = val }
  }
})

const busMock = () => ({ $on: jest.fn(), $off: jest.fn(), $emit: jest.fn() })

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

const remoteSchema = () => ({
  title: 'Users',
  domain: 'users',
  primaryKey: 'id',
  properties: [],
  api: {
    rootApi: 'https://api.example.com/users',
    pagination: { pageField: 'page', limitField: 'limit' },
    params: { limit: 15 }
  }
})

const localSchema = () => ({
  title: 'Items',
  domain: 'items',
  primaryKey: 'id',
  properties: [],
  api: { bypassGetData: true }
})

const mount = (propsData = {}) => shallowMount(Table, {
  localVue,
  store: makeStore(),
  propsData: { schema: localSchema(), resource: [], ...propsData },
  mocks: { $bus: busMock() }
})

describe('table.vue', () => {
  describe('component', () => {
    it('has name "Table"', () => {
      expect(Table.name).toBe('Table')
    })

    it('is a Vue instance', () => {
      expect(mount().isVueInstance()).toBe(true)
    })

    it('defaults layout to "table"', () => {
      expect(Table.props.layout.default).toBe('table')
    })
  })

  describe('boot() — routing logic', () => {
    it('sets remote=false when bypassGetData is true', async () => {
      const wrapper = mount({ schema: localSchema(), resource: [] })
      await flushPromises()
      expect(wrapper.vm.remote).toBe(false)
    })

    it('sets remote=true when rootApi is configured', async () => {
      const wrapper = mount({ schema: remoteSchema() })
      await flushPromises()
      expect(wrapper.vm.remote).toBe(true)
    })

    it('sets renderComponent=true after boot', async () => {
      const wrapper = mount({ schema: localSchema(), resource: [] })
      await flushPromises()
      expect(wrapper.vm.renderComponent).toBe(true)
    })

    it('registers reload bus listener on boot', async () => {
      const bus = busMock()
      shallowMount(Table, {
        localVue,
        store: makeStore(),
        propsData: { schema: remoteSchema() },
        mocks: { $bus: bus }
      })
      await flushPromises()
      expect(bus.$on).toHaveBeenCalledWith('users:reload', expect.any(Function))
    })

    it('fetches data on init when rootApi is present', async () => {
      const { getData } = require('@/services/models')
      getData.mockClear()
      mount({ schema: remoteSchema() })
      await flushPromises()
      expect(getData).toHaveBeenCalled()
    })
  })

  describe('fetchData()', () => {
    it('starts with loader=false', () => {
      const wrapper = mount()
      expect(wrapper.vm.loader).toBe(false)
    })

    it('sets loader=false after successful fetch', async () => {
      const wrapper = mount({ schema: remoteSchema() })
      await flushPromises()
      expect(wrapper.vm.loader).toBe(false)
    })

    it('stores fetched data in data property', async () => {
      const wrapper = mount({ schema: remoteSchema() })
      await flushPromises()
      expect(wrapper.vm.data).toEqual({ rows: [{ id: 1 }, { id: 2 }], total: 2 })
    })

    it('sets loader=false even when fetch fails', async () => {
      const { getData } = require('@/services/models')
      getData.mockRejectedValueOnce(new Error('Network error'))
      const wrapper = shallowMount(Table, {
        localVue,
        store: makeStore(),
        propsData: { schema: remoteSchema() },
        mocks: { $bus: busMock(), $message: jest.fn() }
      })
      await flushPromises()
      expect(wrapper.vm.loader).toBe(false)
    })
  })

  describe('validateQueryInfo()', () => {
    let wrapper
    beforeEach(() => { wrapper = mount() })

    it.each([
      ['page', true],
      ['sort', true],
      ['pageSize', true],
      ['init', true],
      ['pageChange', true],
      ['sizeChange', true],
      ['size', true],
    ])('returns true for type "%s"', (type, expected) => {
      expect(wrapper.vm.validateQueryInfo({ type })).toBe(expected)
    })

    it.each([
      ['invalid'],
      ['unknown'],
      ['fetch'],
    ])('returns false for type "%s"', (type) => {
      expect(wrapper.vm.validateQueryInfo({ type })).toBe(false)
    })

    it('returns false for null', () => {
      expect(wrapper.vm.validateQueryInfo(null)).toBe(false)
    })

    it('returns false for non-object', () => {
      expect(wrapper.vm.validateQueryInfo('page')).toBe(false)
    })

    it('returns false for filter with no filters array', () => {
      expect(wrapper.vm.validateQueryInfo({ type: 'filter', filters: [] })).toBe(false)
    })

    it('returns true for filter with valid prop', () => {
      expect(wrapper.vm.validateQueryInfo({
        type: 'filter',
        filters: [{ prop: 'name', value: 'test' }]
      })).toBe(true)
    })
  })

  describe('alertDataChange()', () => {
    it('emits grid:changed when total increases', () => {
      const bus = busMock()
      const wrapper = shallowMount(Table, {
        localVue, store: makeStore(),
        propsData: { schema: localSchema(), resource: [] },
        mocks: { $bus: bus }
      })
      wrapper.vm.alertDataChange({ total: 10 }, { total: 5 })
      expect(bus.$emit).toHaveBeenCalledWith(
        'items:grid:changed',
        expect.objectContaining({
          title: 'Pluggable Dashboard Alert',
          body: expect.stringContaining('5 new register')
        })
      )
    })

    it('emits grid:changed with deletion message when total decreases', () => {
      const bus = busMock()
      const wrapper = shallowMount(Table, {
        localVue, store: makeStore(),
        propsData: { schema: localSchema(), resource: [] },
        mocks: { $bus: bus }
      })
      wrapper.vm.alertDataChange({ total: 3 }, { total: 8 })
      expect(bus.$emit).toHaveBeenCalledWith(
        'items:grid:changed',
        expect.objectContaining({ body: expect.stringContaining('5 delection') })
      )
    })
  })

  describe('destroyActions()', () => {
    it('unregisters bus listener on destroy', async () => {
      const bus = busMock()
      const wrapper = shallowMount(Table, {
        localVue, store: makeStore(),
        propsData: { schema: remoteSchema() },
        mocks: { $bus: bus }
      })
      await flushPromises()
      wrapper.destroy()
      expect(bus.$off).toHaveBeenCalledWith('users:reload', expect.any(Function))
    })
  })
})
