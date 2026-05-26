import { shallowMount, createLocalVue } from '@vue/test-utils'
import CoreuiVue from '@coreui/vue'
import Vuex from 'vuex'
import Auth from '@/views/crud/auth.vue'

jest.mock('@/services/models', () => ({
  request: jest.fn().mockResolvedValue({})
}))

const localVue = createLocalVue()
localVue.use(CoreuiVue)
localVue.use(Vuex)

const makeStore = (currentProject = { code: 'test' }) => new Vuex.Store({
  state: {
    currentProject,
    auth: {},
    loading: {}
  },
  mutations: {
    set: jest.fn(),
    setLoader: jest.fn(),
    setAuth: jest.fn()
  }
})

const busMock = () => ({ $on: jest.fn(), $off: jest.fn(), $emit: jest.fn() })

// Project WITHOUT auth — hasAuth = false → login = true immediately (no form shown)
const projectNoAuth = { code: 'test' }

// Project WITH auth — hasAuth = true → shows login form
const projectWithAuth = {
  code: 'test',
  auth: {
    url_login: 'https://api.example.com/login',
    url_method: 'post',
    field_username: 'email',
    field_secret: 'password',
    response_mode: 'body',
    response_token: 'token',
    request_mode: 'header',
    request_token: 'access-token'
  }
}

const schema = { domain: 'users', api: {}, session: 'test' }

beforeEach(() => {
  // Ensure sessionStorage returns null so auth doesn't auto-login
  jest.spyOn(window.sessionStorage.__proto__, 'getItem').mockReturnValue(null)
})

afterEach(() => {
  jest.restoreAllMocks()
})

const mountAuth = (propsData = {}, methods = {}) => shallowMount(Auth, {
  localVue,
  store: makeStore(projectWithAuth),
  propsData: { project: projectWithAuth, schema: { ...schema }, ...propsData },
  mocks: { $bus: busMock(), $message: jest.fn() },
  methods
})

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

describe('auth.vue', () => {
  describe('initial data', () => {
    it('starts with loading=false', () => {
      expect(Auth.data().loading).toBe(false)
    })

    it('starts with login=false', () => {
      expect(Auth.data().login).toBe(false)
    })

    it('starts with empty model', () => {
      expect(Auth.data().model).toEqual({})
    })
  })

  describe('without project auth (hasAuth = false)', () => {
    it('sets login=true immediately — no form needed', async () => {
      const wrapper = shallowMount(Auth, {
        localVue,
        store: new Vuex.Store({ state: { currentProject: { code: 'test' }, auth: {} } }),
        propsData: { project: projectNoAuth, schema: { ...schema } },
        mocks: { $bus: busMock(), $message: jest.fn() }
      })
      await flushPromises()
      expect(wrapper.vm.login).toBe(true)
    })
  })

  describe('with project auth (sessionStorage empty)', () => {
    it('sets login=false and shows login form', async () => {
      const wrapper = mountAuth()
      await flushPromises()
      expect(wrapper.vm.login).toBe(false)
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('doAuth()', () => {
    it('sets loading=true while authenticating', () => {
      const authenticate = jest.fn().mockReturnValue(new Promise(() => {}))
      const wrapper = mountAuth({}, { authenticate })
      wrapper.vm.doAuth({ username: 'user', secret: 'pass' })
      expect(wrapper.vm.loading).toBe(true)
    })

    it('calls authenticate with the form data', () => {
      const authenticate = jest.fn().mockReturnValue(new Promise(() => {}))
      const wrapper = mountAuth({}, { authenticate })
      wrapper.vm.doAuth({ username: 'user', secret: 'pass' })
      expect(authenticate).toHaveBeenCalledWith({ username: 'user', secret: 'pass' })
    })
  })

  describe('success()', () => {
    it('emits auth:logged when token is found', () => {
      const wrapper = mountAuth({}, {
        storageToken: jest.fn().mockReturnValue('my-token'),
        authRequest: jest.fn().mockReturnValue({ headers: {} })
      })
      wrapper.vm.success({ data: { token: 'my-token' }, headers: {} })
      expect(wrapper.emitted('auth:logged')).toBeTruthy()
    })

    it('sets login=true after successful auth', () => {
      const wrapper = mountAuth({}, {
        storageToken: jest.fn().mockReturnValue('tok'),
        authRequest: jest.fn().mockReturnValue({})
      })
      wrapper.vm.success({ data: { token: 'tok' }, headers: {} })
      expect(wrapper.vm.login).toBe(true)
    })

    it('sets loading=false after successful auth', () => {
      const wrapper = mountAuth({}, {
        storageToken: jest.fn().mockReturnValue('tok'),
        authRequest: jest.fn().mockReturnValue({})
      })
      wrapper.vm.loading = true
      wrapper.vm.success({ data: { token: 'tok' }, headers: {} })
      expect(wrapper.vm.loading).toBe(false)
    })

    it('emits auth:failed when no token found', () => {
      const wrapper = mountAuth({}, {
        storageToken: jest.fn().mockReturnValue(null)
      })
      wrapper.vm.success({ data: {}, headers: {} })
      expect(wrapper.emitted('auth:failed')).toBeTruthy()
    })

    it('sets loading=false when token is missing', () => {
      const wrapper = mountAuth({}, {
        storageToken: jest.fn().mockReturnValue(null)
      })
      wrapper.vm.loading = true
      wrapper.vm.success({ data: {}, headers: {} })
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('error()', () => {
    it('emits auth:failed with message', () => {
      const wrapper = mountAuth()
      wrapper.vm.error({ message: 'Unauthorized', response: null })
      expect(wrapper.emitted('auth:failed')).toBeTruthy()
      expect(wrapper.emitted('auth:failed')[0][0]).toEqual({ message: 'Unauthorized' })
    })

    it('sets loading=false after error', () => {
      const wrapper = mountAuth()
      wrapper.vm.loading = true
      wrapper.vm.error({ message: 'fail', response: null })
      expect(wrapper.vm.loading).toBe(false)
    })

    it('shows error message via $message', () => {
      const $message = jest.fn()
      const wrapper = shallowMount(Auth, {
        localVue, store: makeStore(),
        propsData: { project: projectWithAuth, schema: { ...schema } },
        mocks: { $bus: busMock(), $message }
      })
      wrapper.vm.error({ message: 'Bad credentials', response: null })
      expect($message).toHaveBeenCalled()
    })
  })

  describe('logout()', () => {
    it('calls doLogout', async () => {
      const doLogout = jest.fn().mockResolvedValue({})
      const wrapper = mountAuth({}, { doLogout })
      await wrapper.vm.logout()
      expect(doLogout).toHaveBeenCalled()
    })

    it('sets login=false after logout', async () => {
      const doLogout = jest.fn().mockResolvedValue({})
      const wrapper = mountAuth({}, { doLogout })
      wrapper.vm.login = true
      await wrapper.vm.logout()
      expect(wrapper.vm.login).toBe(false)
    })

    it('sets loading=false after logout', async () => {
      const doLogout = jest.fn().mockResolvedValue({})
      const wrapper = mountAuth({}, { doLogout })
      await wrapper.vm.logout()
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('template rendering', () => {
    it('renders slot content when login=true', async () => {
      const wrapper = shallowMount(Auth, {
        localVue, store: makeStore(),
        propsData: { project: projectWithAuth, schema: { ...schema } },
        mocks: { $bus: busMock(), $message: jest.fn() },
        slots: { default: '<div class="slot-content">Dashboard</div>' }
      })
      wrapper.vm.login = true
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.slot-content').exists()).toBe(true)
    })

    it('shows login container when login=false and loading=false', async () => {
      const wrapper = mountAuth()
      await flushPromises()
      wrapper.vm.login = false
      wrapper.vm.loading = false
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.col-12.col-md-4').exists()).toBe(true)
    })
  })
})
