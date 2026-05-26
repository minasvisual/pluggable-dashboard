import { shallowMount, createLocalVue } from '@vue/test-utils'
import CoreuiVue from '@coreui/vue'
import Vuex from 'vuex'
import Formulate from '@/views/crud/formulate.vue'

jest.mock('@/services/models', () => ({
  getData: jest.fn().mockResolvedValue({}),
  saveData: jest.fn().mockResolvedValue({ id: 1 }),
  loadModel: jest.fn().mockResolvedValue({ api: {}, properties: [], domain: 'test', title: 'Test' })
}))

const localVue = createLocalVue()
localVue.use(CoreuiVue)
localVue.use(Vuex)

const makeStore = () => new Vuex.Store({
  state: {
    loading: { form: false },
    currentProject: { code: 'test', resources_path: '/models/' },
    auth: {}
  },
  mutations: {
    set (state, [key, val]) { state[key] = val },
    setLoader (state, [key, val]) { state.loading[key] = val }
  }
})

const busMock = () => ({ $on: jest.fn(), $off: jest.fn(), $emit: jest.fn() })

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

// Standalone form: skips getData, resolves immediately with the `data` prop
const standaloneSchema = {
  type: 'form',
  domain: 'settings',
  title: 'Settings',
  primaryKey: 'id',
  properties: [{ name: 'name', label: 'Name', type: 'text' }],
  api: { rootApi: 'https://api.example.com/settings' }
}

// Object schema: would call getData for an existing record
const objectSchema = {
  type: 'object',
  domain: 'users',
  title: 'Users',
  primaryKey: 'id',
  properties: [],
  api: { rootApi: 'https://api.example.com/users' }
}

const mount = (propsData = {}, methods = {}) => shallowMount(Formulate, {
  localVue,
  store: makeStore(),
  propsData: { schema: standaloneSchema, data: {}, ...propsData },
  mocks: { $bus: busMock(), $message: jest.fn() },
  methods
})

describe('formulate.vue', () => {
  describe('initial state', () => {
    it('loader starts as true before mount resolves', () => {
      expect(Formulate.data().loader).toBe(true)
    })

    it('sets loader=false after init completes', async () => {
      const wrapper = mount()
      await flushPromises()
      expect(wrapper.vm.loader).toBe(false)
    })

    it('starts with empty model', () => {
      expect(Formulate.data().model).toEqual({})
    })

    it('starts with null error', () => {
      expect(Formulate.data().error).toBeNull()
    })
  })

  describe('computed: primaryKey', () => {
    it('defaults to "id" when schema.primaryKey is not set', async () => {
      const wrapper = mount({ schema: { ...standaloneSchema, primaryKey: undefined } })
      await flushPromises()
      expect(wrapper.vm.primaryKey).toBe('id')
    })

    it('uses schema.primaryKey when defined', async () => {
      const wrapper = mount({ schema: { ...standaloneSchema, primaryKey: '_id' } })
      await flushPromises()
      expect(wrapper.vm.primaryKey).toBe('_id')
    })
  })

  describe('computed: isStandalone', () => {
    it('returns true when schema.type is "form"', async () => {
      const wrapper = mount({ schema: standaloneSchema })
      await flushPromises()
      expect(wrapper.vm.isStandalone).toBe(true)
    })

    it('returns true when bypassGetById is true', async () => {
      const wrapper = mount({
        schema: { ...objectSchema, api: { ...objectSchema.api, bypassGetById: true } }
      })
      await flushPromises()
      expect(wrapper.vm.isStandalone).toBe(true)
    })

    it('returns true when rootApi is false', async () => {
      const wrapper = mount({
        schema: { ...objectSchema, api: { rootApi: false } }
      })
      await flushPromises()
      expect(wrapper.vm.isStandalone).toBe(true)
    })

    it('returns false for object schema with rootApi', async () => {
      const wrapper = mount({ schema: objectSchema })
      await flushPromises()
      expect(wrapper.vm.isStandalone).toBe(false)
    })
  })

  describe('computed: loading', () => {
    it('reads from Vuex store loading.form', async () => {
      const store = makeStore()
      store.state.loading.form = true
      const wrapper = shallowMount(Formulate, {
        localVue, store,
        propsData: { schema: standaloneSchema, data: {} },
        mocks: { $bus: busMock(), $message: jest.fn() }
      })
      expect(wrapper.vm.loading).toBe(true)
    })
  })

  describe('loadNestedSchema()', () => {
    it('returns the schema as-is when it is an object', async () => {
      const wrapper = mount()
      await flushPromises()
      const result = await wrapper.vm.loadNestedSchema(standaloneSchema)
      expect(result).toEqual(standaloneSchema)
    })

    it('calls loadModelByUrl when schema is a string', async () => {
      const loadModelByUrl = jest.fn().mockResolvedValue({ api: {}, domain: 'test' })
      const wrapper = mount({}, { loadModelByUrl })
      await flushPromises()
      await wrapper.vm.loadNestedSchema('schema.json')
      expect(loadModelByUrl).toHaveBeenCalledWith('/models/schema.json')
    })
  })

  describe('handleError()', () => {
    it('stores object errors in the error property', async () => {
      const wrapper = mount()
      await flushPromises()
      wrapper.vm.handleError({ message: 'Validation failed' })
      expect(wrapper.vm.error).toEqual({ message: 'Validation failed' })
    })

    it('stores string errors in the error property', async () => {
      const wrapper = mount()
      await flushPromises()
      wrapper.vm.handleError('Something went wrong')
      expect(wrapper.vm.error).toBe('Something went wrong')
    })
  })

  describe('submit()', () => {
    it('emits model:saved with form data when save is not true', async () => {
      const wrapper = mount()
      await flushPromises()
      await wrapper.vm.submit({ name: 'Alice' })
      expect(wrapper.emitted('model:saved')).toBeTruthy()
      expect(wrapper.emitted('model:saved')[0][0]).toEqual({ name: 'Alice' })
    })

    it('calls saveData when save=true', async () => {
      const saveData = jest.fn().mockResolvedValue({ id: 1 })
      const wrapper = mount({ save: true }, { saveData })
      await flushPromises()
      await wrapper.vm.submit({ name: 'Bob' })
      expect(saveData).toHaveBeenCalledWith(expect.any(Object), { name: 'Bob' })
    })

    it('emits close after save when save=true', async () => {
      const saveData = jest.fn().mockResolvedValue({ id: 1 })
      const wrapper = mount({ save: true }, { saveData })
      await flushPromises()
      await wrapper.vm.submit({ name: 'Bob' })
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('returns the submitted data', async () => {
      const wrapper = mount()
      await flushPromises()
      const result = await wrapper.vm.submit({ name: 'Test' })
      expect(result).toEqual({ name: 'Test' })
    })
  })

  describe('event bus lifecycle', () => {
    it('registers domain:error listener on mount', async () => {
      const bus = busMock()
      shallowMount(Formulate, {
        localVue, store: makeStore(),
        propsData: { schema: standaloneSchema, data: {} },
        mocks: { $bus: bus, $message: jest.fn() }
      })
      await flushPromises()
      expect(bus.$on).toHaveBeenCalledWith('settings:error', expect.any(Function))
    })

    it('unregisters domain:error listener on destroy', async () => {
      const bus = busMock()
      const wrapper = shallowMount(Formulate, {
        localVue, store: makeStore(),
        propsData: { schema: standaloneSchema, data: {} },
        mocks: { $bus: bus, $message: jest.fn() }
      })
      await flushPromises()
      wrapper.destroy()
      expect(bus.$off).toHaveBeenCalledWith('settings:error', expect.any(Function))
    })
  })

  describe('getRow()', () => {
    it('resolves with empty object when data is null', async () => {
      const wrapper = mount({ data: null })
      await flushPromises()
      const result = await wrapper.vm.getRow()
      expect(result).toEqual({})
    })

    it('resolves with empty object when data has no primaryKey', async () => {
      const wrapper = mount({ data: { name: 'no id' } })
      await flushPromises()
      const result = await wrapper.vm.getRow()
      expect(result).toEqual({})
    })

    it('calls getData when data has the primaryKey', async () => {
      const getData = jest.fn().mockResolvedValue({ id: 5, name: 'Test' })
      const wrapper = mount({ schema: objectSchema, data: { id: 5 } }, { getData })
      await flushPromises()
      await wrapper.vm.getRow()
      expect(getData).toHaveBeenCalled()
    })
  })
})
