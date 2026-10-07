jest.mock('axios-cache-adapter', () => {
  const api = jest.fn(() => Promise.resolve({ data: {}, request: { fromCache: false } }))
  api.interceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } }
  return { setup: () => api }
})
jest.mock('@/store', () => ({ state: { currentProject: {} }, dispatch: jest.fn() }))

import { setup } from 'axios-cache-adapter'
import { getData, saveData, deleteData } from '@/services/models'
import { filterParams } from '@/services/helpers'

const mockApi = setup()

const schema = () => ({
  primaryKey: 'id',
  api: {
    rootApi: 'https://api.example.com/users',
    wrapData: 'rows',
    totalData: 'count',
    pagination: {
      pageField: 'page', limitField: 'limit', sortField: 'order', sortExp: '{sort}',
      filterField: 'filter', filterExp: '{prop},like,%{value}%'
    },
    params: { app: 'x' }
  }
})

// what table.vue does after the user paginates / sorts / filters
const withQueryUrls = (s) => {
  s.api.urlPatch = '/{id}{query}'
  s.api.urlPost = '{query}'
  s.api.urlDelete = '/{id}{query}'
  return s
}

const listState = (s) => {
  s.api = filterParams(s.api, {
    page: 3, pageSize: 25,
    sort: { prop: 'name', order: 'ascending' },
    filters: [{ prop: 'name', value: 'ali' }]
  })
  return s
}

const lastUrl = () => mockApi.mock.calls[mockApi.mock.calls.length - 1][0].url

beforeEach(() => mockApi.mockClear())

describe('list request', () => {
  it('sends page, limit, sort and filter', async () => {
    await getData(listState(schema()), { type: 'page', page: 3 })
    const url = lastUrl()
    expect(url).toContain('page=3')
    expect(url).toContain('limit=25')
    expect(url).toContain('order=asc')
    expect(url).toContain('filter=name%2Clike%2C%25ali%25')
    expect(url).toContain('app=x')
  })

  it('maps wrapData / totalData into rows and total', async () => {
    mockApi.mockResolvedValueOnce({ data: { rows: [{ id: 1 }, { id: 2 }], count: 42 }, request: {} })
    const res = await getData(schema(), { type: 'init', page: 1 })
    expect(res).toEqual({ rows: [{ id: 1 }, { id: 2 }], total: 42 })
  })
})

describe('edit after paginating (regression)', () => {
  it('saveData PUT carries no page/limit/sort/filter params', async () => {
    await saveData(listState(withQueryUrls(schema())), { id: 7, name: 'Alice' })
    const call = mockApi.mock.calls[0][0]
    expect(call.method).toBe('PUT')
    expect(call.url).toBe('https://api.example.com/users/7?app=x')
  })

  it('saveData POST (create) carries no list params either', async () => {
    await saveData(listState(withQueryUrls(schema())), { name: 'New' })
    expect(mockApi.mock.calls[0][0].method).toBe('POST')
    expect(lastUrl()).toBe('https://api.example.com/users?app=x')
  })

  it('get by id carries no list params', async () => {
    await getData(listState(schema()), { id: 7 })
    expect(lastUrl()).toBe('https://api.example.com/users/7?app=x')
  })

  it('delete carries no list params', async () => {
    await deleteData(listState(withQueryUrls(schema())), { id: 7 })
    expect(mockApi.mock.calls[0][0].method).toBe('DELETE')
    expect(lastUrl()).toBe('https://api.example.com/users/7?app=x')
  })

  it('default urls (no {query}) send no params at all', async () => {
    await saveData(listState(schema()), { id: 7, name: 'Alice' })
    expect(lastUrl()).toBe('https://api.example.com/users/7')
  })

  it('the list keeps its state after a record was edited', async () => {
    const s = listState(withQueryUrls(schema()))
    await saveData(s, { id: 7, name: 'Alice' })
    await getData(s, { type: 'pageChange' })
    expect(lastUrl()).toContain('page=3')
    expect(lastUrl()).toContain('filter=')
  })
})
