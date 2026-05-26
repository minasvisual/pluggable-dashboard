import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import Timer from '@/views/crud/shared/Timer.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

const makeStore = (actions = {}) => new Vuex.Store({
  state: {},
  actions: {
    notification: jest.fn(),
    ...actions
  }
})

const busMock = () => ({ $on: jest.fn(), $off: jest.fn(), $emit: jest.fn() })

const mount = (propsData = {}, bus = busMock()) => shallowMount(Timer, {
  localVue,
  store: makeStore(),
  propsData: { domain: 'users', active: false, alert: false, ...propsData },
  mocks: { $bus: bus }
})

describe('Timer.vue', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('initial state', () => {
    it('minutes defaults to 1', () => {
      expect(Timer.data().minutes).toBe(1)
    })

    it('interval starts as null', () => {
      expect(Timer.data().interval).toBe(null)
    })
  })

  describe('startReload()', () => {
    it('creates an interval', () => {
      const wrapper = mount()
      wrapper.vm.startReload()
      expect(wrapper.vm.interval).not.toBeNull()
    })

    it('emits update:alert=true', () => {
      const wrapper = mount()
      wrapper.vm.startReload()
      expect(wrapper.emitted('update:alert')).toBeTruthy()
      expect(wrapper.emitted('update:alert')[0][0]).toBe(true)
    })

    it('does not create a second interval when already running', () => {
      const wrapper = mount()
      wrapper.vm.startReload()
      const first = wrapper.vm.interval
      wrapper.vm.startReload()
      expect(wrapper.vm.interval).toBe(first)
    })
  })

  describe('stopReload()', () => {
    it('sets interval to null', () => {
      const wrapper = mount()
      wrapper.vm.startReload()
      wrapper.vm.stopReload()
      expect(wrapper.vm.interval).toBeNull()
    })

    it('emits update:active=false', () => {
      const wrapper = mount()
      wrapper.vm.startReload()
      wrapper.vm.stopReload()
      const activeEmits = wrapper.emitted('update:active')
      expect(activeEmits[activeEmits.length - 1][0]).toBe(false)
    })

    it('emits update:alert=false', () => {
      const wrapper = mount()
      wrapper.vm.startReload()
      wrapper.vm.stopReload()
      const alertEmits = wrapper.emitted('update:alert')
      expect(alertEmits[alertEmits.length - 1][0]).toBe(false)
    })
  })

  describe('runReload()', () => {
    it('emits ${domain}:reload on the event bus', () => {
      const bus = busMock()
      const wrapper = mount({ domain: 'products' }, bus)
      wrapper.vm.runReload()
      expect(bus.$emit).toHaveBeenCalledWith('products:reload', {})
    })

    it('fires automatically after one interval period', () => {
      const bus = busMock()
      const wrapper = mount({ domain: 'users' }, bus)
      wrapper.vm.minutes = 1
      wrapper.vm.startReload()
      jest.advanceTimersByTime(60000)
      expect(bus.$emit).toHaveBeenCalledWith('users:reload', {})
    })

    it('fires multiple times with multiple intervals', () => {
      const bus = busMock()
      const wrapper = mount({ domain: 'users' }, bus)
      wrapper.vm.minutes = 1
      wrapper.vm.startReload()
      jest.advanceTimersByTime(180000) // 3 minutes
      const reloadCalls = bus.$emit.mock.calls.filter(c => c[0] === 'users:reload')
      expect(reloadCalls.length).toBeGreaterThanOrEqual(3)
    })

    it('stops firing after stopReload()', () => {
      const bus = busMock()
      const wrapper = mount({ domain: 'users' }, bus)
      wrapper.vm.minutes = 1
      wrapper.vm.startReload()
      jest.advanceTimersByTime(60000) // fires once
      wrapper.vm.stopReload()
      bus.$emit.mockClear()
      jest.advanceTimersByTime(120000) // should not fire again
      const reloadCalls = bus.$emit.mock.calls.filter(c => c[0] === 'users:reload')
      expect(reloadCalls.length).toBe(0)
    })
  })

  describe('watcher: active prop', () => {
    it('starts reload when active changes to true', async () => {
      const wrapper = mount({ active: false })
      const startReload = jest.spyOn(wrapper.vm, 'startReload')
      await wrapper.setProps({ active: true })
      expect(startReload).toHaveBeenCalled()
    })

    it('stops reload when active changes to false', async () => {
      const wrapper = mount({ active: true })
      const stopReload = jest.spyOn(wrapper.vm, 'stopReload')
      await wrapper.setProps({ active: false })
      expect(stopReload).toHaveBeenCalled()
    })

    it('emits update:active with the new value', async () => {
      const wrapper = mount({ active: false })
      await wrapper.setProps({ active: true })
      expect(wrapper.emitted('update:active')).toBeTruthy()
      expect(wrapper.emitted('update:active')[0][0]).toBe(true)
    })
  })

  describe('sendNotification()', () => {
    it('dispatches notification to Vuex when alert=true', () => {
      const notification = jest.fn()
      const store = new Vuex.Store({
        state: {},
        actions: { notification }
      })
      const wrapper = shallowMount(Timer, {
        localVue, store,
        propsData: { domain: 'users', active: false, alert: true },
        mocks: { $bus: busMock() }
      })
      wrapper.vm.sendNotification({ title: 'Alert', body: 'New data' })
      expect(notification).toHaveBeenCalled()
    })

    it('does NOT dispatch when alert=false', () => {
      const notification = jest.fn()
      const store = new Vuex.Store({
        state: {},
        actions: { notification }
      })
      const wrapper = shallowMount(Timer, {
        localVue, store,
        propsData: { domain: 'users', active: false, alert: false },
        mocks: { $bus: busMock() }
      })
      wrapper.vm.sendNotification({ title: 'Alert', body: 'New data' })
      expect(notification).not.toHaveBeenCalled()
    })
  })

  describe('lifecycle', () => {
    it('registers ${domain}:grid:changed bus listener on mount', () => {
      const bus = busMock()
      shallowMount(Timer, {
        localVue, store: makeStore(),
        propsData: { domain: 'users', active: false, alert: false },
        mocks: { $bus: bus }
      })
      expect(bus.$on).toHaveBeenCalledWith('users:grid:changed', expect.any(Function))
    })

    it('unregisters bus listener on destroy', () => {
      const bus = busMock()
      const wrapper = shallowMount(Timer, {
        localVue, store: makeStore(),
        propsData: { domain: 'users', active: false, alert: false },
        mocks: { $bus: bus }
      })
      wrapper.destroy()
      expect(bus.$off).toHaveBeenCalledWith('users:grid:changed', expect.any(Function))
    })

    it('clears interval on destroy if running', () => {
      const wrapper = mount()
      wrapper.vm.startReload()
      expect(wrapper.vm.interval).not.toBeNull()
      wrapper.destroy()
      expect(wrapper.vm.interval).toBeNull()
    })
  })
})
