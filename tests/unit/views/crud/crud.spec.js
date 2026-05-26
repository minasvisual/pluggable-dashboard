import { shallowMount, createLocalVue } from '@vue/test-utils'
import CoreuiVue from '@coreui/vue'
import Vuex from 'vuex'
import Crud from '@/views/crud/crud.vue'

jest.mock('@/services/models', () => ({
  getData: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
  saveData: jest.fn().mockResolvedValue({ id: 1 }),
  deleteData: jest.fn().mockResolvedValue({})
}))

const localVue = createLocalVue()
localVue.use(CoreuiVue)
localVue.use(Vuex)

const makeStore = () => new Vuex.Store({
  state: {
    loading: {},
    currentProject: { code: 'test' },
    auth: {},
    crud: {},
    schemas: {}
  },
  mutations: {
    set (state, [key, val]) { state[key] = val },
    setLoader (state, [key, val]) { state.loading[key] = val },
    setSchema (state, [key, val]) { state.schemas[key] = val }
  }
})

const busMock = () => ({ $on: jest.fn(), $off: jest.fn(), $emit: jest.fn() })

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

const schema = {
  title: 'Users',
  domain: 'users',
  primaryKey: 'id',
  properties: [],
  api: {
    rootApi: 'https://api.example.com/users',
    params: {}
  }
}

const mount = (propsData = {}, methods = {}) => shallowMount(Crud, {
  localVue,
  store: makeStore(),
  propsData: { schema, ...propsData },
  mocks: { $bus: busMock(), $message: jest.fn() },
  methods
})

describe('crud.vue', () => {
  describe('component', () => {
    it('is a Vue instance', () => {
      expect(mount().isVueInstance()).toBe(true)
    })

    it('has name "GridBase"', () => {
      expect(Crud.name).toBe('GridBase')
    })
  })

  describe('actions() — FORM_CREATE', () => {
    it('sets formopen=true', () => {
      const wrapper = mount()
      wrapper.vm.actions('FORM_CREATE', {})
      expect(wrapper.vm.formopen).toBe(true)
    })

    it('resets row to empty object', () => {
      const wrapper = mount()
      wrapper.vm.row = { id: 5, name: 'Old' }
      wrapper.vm.actions('FORM_CREATE', {})
      expect(wrapper.vm.row).toEqual({})
    })

    it('commits row to Vuex crud state', () => {
      const wrapper = mount()
      wrapper.vm.actions('FORM_CREATE', {})
      expect(wrapper.vm.crud.row).toEqual({})
    })
  })

  describe('actions() — FORM_EDIT', () => {
    it('sets formopen=true', () => {
      const wrapper = mount()
      wrapper.vm.actions('FORM_EDIT', { id: 3, name: 'Alice' })
      expect(wrapper.vm.formopen).toBe(true)
    })

    it('stores a copy of the row data', () => {
      const wrapper = mount()
      const original = { id: 3, name: 'Alice' }
      wrapper.vm.actions('FORM_EDIT', original)
      expect(wrapper.vm.row).toEqual(original)
    })

    it('does not share reference with original data', () => {
      const wrapper = mount()
      const original = { id: 3, name: 'Alice' }
      wrapper.vm.actions('FORM_EDIT', original)
      original.name = 'Mutated'
      expect(wrapper.vm.row.name).toBe('Alice')
    })
  })

  describe('actions() — FORM_DELETE', () => {
    it('calls deleteData with schema and row', async () => {
      const deleteData = jest.fn().mockResolvedValue({})
      const reloadData = jest.fn()
      const wrapper = mount({}, { deleteData, reloadData })
      wrapper.vm.actions('FORM_DELETE', { id: 7 })
      expect(deleteData).toHaveBeenCalledWith(schema, { id: 7 })
      await flushPromises()
    })
  })

  describe('formTitle', () => {
    it('returns "New {title}" for row without id', () => {
      const wrapper = mount()
      wrapper.vm.row = {}
      expect(wrapper.vm.formTitle).toBe('New Users')
    })

    it('returns "Update {title} | ID: {id}" for row with id', () => {
      const wrapper = mount()
      wrapper.vm.row = { id: 42 }
      expect(wrapper.vm.formTitle).toBe('Update Users | ID: 42')
    })

    it('returns "New {title}" for null row', () => {
      const wrapper = mount()
      wrapper.vm.row = null
      expect(wrapper.vm.formTitle).toBe('New Users')
    })
  })

  describe('closeForm()', () => {
    it('sets formopen=false', () => {
      const wrapper = mount()
      wrapper.vm.formopen = true
      wrapper.vm.closeForm({ refresh: false })
      expect(wrapper.vm.formopen).toBe(false)
    })

    it('calls reloadData when refresh=true', () => {
      const reloadData = jest.fn()
      const wrapper = mount({}, { reloadData })
      wrapper.vm.closeForm({ refresh: true })
      expect(reloadData).toHaveBeenCalled()
    })

    it('does not call reloadData when refresh=false', () => {
      const reloadData = jest.fn()
      const wrapper = mount({}, { reloadData })
      wrapper.vm.closeForm({ refresh: false })
      expect(reloadData).not.toHaveBeenCalled()
    })
  })

  describe('reloadData()', () => {
    it('calls fetchData on the table ref', () => {
      const wrapper = mount()
      const fetchData = jest.fn().mockResolvedValue(true)
      wrapper.vm.$refs.tables = { fetchData }
      wrapper.vm.reloadData()
      expect(fetchData).toHaveBeenCalledWith({ type: 'pageChange' })
    })

    it('closes the form after reload', () => {
      const wrapper = mount()
      wrapper.vm.formopen = true
      wrapper.vm.$refs.tables = { fetchData: jest.fn().mockResolvedValue(true) }
      wrapper.vm.reloadData()
      expect(wrapper.vm.formopen).toBe(false)
    })
  })

  describe('formHook()', () => {
    it('calls saveData with schema and data', async () => {
      const saveData = jest.fn().mockResolvedValue({ id: 1 })
      const wrapper = mount({}, { saveData })
      wrapper.vm.$refs.tables = { fetchData: jest.fn().mockResolvedValue(true) }
      await wrapper.vm.formHook({ id: 1, name: 'Test' })
      expect(saveData).toHaveBeenCalledWith(schema, { id: 1, name: 'Test' })
    })

    it('closes form after successful save', async () => {
      const saveData = jest.fn().mockResolvedValue({ id: 1 })
      const wrapper = mount({}, { saveData })
      wrapper.vm.formopen = true
      wrapper.vm.$refs.tables = { fetchData: jest.fn().mockResolvedValue(true) }
      await wrapper.vm.formHook({ id: 1, name: 'Test' })
      expect(wrapper.vm.formopen).toBe(false)
    })
  })

  describe('event bus lifecycle', () => {
    it('registers domain:save listener on mount', () => {
      const bus = busMock()
      shallowMount(Crud, {
        localVue, store: makeStore(),
        propsData: { schema },
        mocks: { $bus: bus, $message: jest.fn() }
      })
      expect(bus.$on).toHaveBeenCalledWith('users:save', expect.any(Function))
    })

    it('unregisters domain:save listener on destroy', () => {
      const bus = busMock()
      const wrapper = shallowMount(Crud, {
        localVue, store: makeStore(),
        propsData: { schema },
        mocks: { $bus: bus, $message: jest.fn() }
      })
      wrapper.destroy()
      expect(bus.$off).toHaveBeenCalledWith('users:save', expect.any(Function))
    })

    it('registers model:redirect listener on mount', () => {
      const bus = busMock()
      shallowMount(Crud, {
        localVue, store: makeStore(),
        propsData: { schema },
        mocks: { $bus: bus, $message: jest.fn() }
      })
      expect(bus.$on).toHaveBeenCalledWith('model:redirect', expect.any(Function))
    })
  })
})
