import { filterParams, itemParams } from '@/services/helpers'

const makeApi = (pagination = {}, params = {}) => ({
  rootApi: 'https://api.example.com/users',
  pagination: {
    pageField: 'page',
    limitField: 'limit',
    sortField: 'order',
    sortExp: '{sort}',
    filterField: 'filter',
    filterExp: '{prop},like,%{value}%',
    ...pagination
  },
  params
})

describe('filterParams()', () => {
  describe('pagination', () => {
    it('sets the page param', () => {
      expect(filterParams(makeApi(), { page: 3 }).params.page).toBe(3)
    })

    it('sets the limit param from pageSize', () => {
      expect(filterParams(makeApi(), { pageSize: 25 }).params.limit).toBe(25)
    })

    it('uses custom page / limit field names', () => {
      const api = makeApi({ pageField: 'skip', limitField: 'per_page' })
      expect(filterParams(api, { page: 2, pageSize: 10 }).params).toMatchObject({ skip: 2, per_page: 10 })
    })

    it('ignores page when the schema has no pageField', () => {
      const api = makeApi()
      delete api.pagination.pageField
      expect(filterParams(api, { page: 2 }).params).not.toHaveProperty('page')
    })

    it('keeps fixed params and never mutates the received api', () => {
      const api = makeApi({}, { fixed: 'x' })
      const out = filterParams(api, { page: 2 })
      expect(out.params).toEqual({ fixed: 'x', page: 2 })
      expect(api.params).toEqual({ fixed: 'x' })
    })

    it('keeps previous page/limit when the query does not carry them', () => {
      const api = makeApi({}, { page: 4, limit: 15 })
      expect(filterParams(api, { type: 'pageChange' }).params).toMatchObject({ page: 4, limit: 15 })
    })
  })

  describe('sort', () => {
    it('ascending with default chars', () => {
      const out = filterParams(makeApi(), { sort: { prop: 'name', order: 'ascending' } })
      expect(out.params.order).toBe('asc')
    })

    it('descending with default chars', () => {
      const out = filterParams(makeApi(), { sort: { prop: 'name', order: 'descending' } })
      expect(out.params.order).toBe('desc')
    })

    it('interpolates {prop},{sort} and custom chars', () => {
      const api = makeApi({ sortExp: '{prop},{sort}', sortAscChar: '+', sortDescChar: '-' })
      expect(filterParams(api, { sort: { prop: 'name', order: 'descending' } }).params.order).toBe('name,-')
    })

    it('supports {order} in the expression (default expression)', () => {
      const api = makeApi({ sortExp: '{prop},{order}' })
      expect(filterParams(api, { sort: { prop: 'name', order: 'ascending' } }).params.order).toBe('name,asc')
    })

    it('does nothing without sortExp', () => {
      const api = makeApi()
      delete api.pagination.sortExp
      expect(filterParams(api, { sort: { prop: 'name', order: 'ascending' } }).params).not.toHaveProperty('order')
    })
  })

  describe('filters', () => {
    it('builds the filter param from filterExp', () => {
      const out = filterParams(makeApi(), { filters: [{ prop: 'name', value: 'ali' }] })
      expect(out.params.filter).toBe('name,like,%ali%')
    })

    it('uses the first filter that has a value (not just filters[0])', () => {
      const out = filterParams(makeApi(), { filters: [{ prop: 'id', value: '' }, { prop: 'name', value: 'bob' }] })
      expect(out.params.filter).toBe('name,like,%bob%')
    })

    it('removes the filter param when all filters are cleared', () => {
      const api = makeApi({}, { filter: 'name,like,%ali%' })
      const out = filterParams(api, { filters: [{ prop: 'name', value: '' }] })
      expect(out.params).not.toHaveProperty('filter')
    })

    it('KEEPS the active filter when only the page changes', () => {
      const api = makeApi({}, { filter: 'name,like,%ali%' })
      expect(filterParams(api, { page: 2 }).params.filter).toBe('name,like,%ali%')
    })

    it('KEEPS the active filter when only the page size changes', () => {
      const api = makeApi({}, { filter: 'name,like,%ali%' })
      expect(filterParams(api, { pageSize: 50 }).params.filter).toBe('name,like,%ali%')
    })

    it('KEEPS the active sort when the filter changes', () => {
      const api = makeApi({}, { order: 'asc' })
      const out = filterParams(api, { filters: [{ prop: 'name', value: 'x' }] })
      expect(out.params.order).toBe('asc')
    })
  })

  it('combines page + limit + sort + filter in a single request', () => {
    const out = filterParams(makeApi(), {
      page: 1, pageSize: 15,
      sort: { prop: 'name', order: 'ascending' },
      filters: [{ prop: 'name', value: 'a' }]
    })
    expect(out.params).toEqual({ page: 1, limit: 15, order: 'asc', filter: 'name,like,%a%' })
  })
})

describe('itemParams() — params for get-by-id / save / delete', () => {
  it('drops page, limit, sort and filter but keeps fixed params', () => {
    const api = makeApi({}, { page: 3, limit: 15, order: 'asc', filter: 'a,like,%b%', token: 'abc' })
    expect(itemParams(api)).toEqual({ token: 'abc' })
  })

  it('drops filter keys built from a templated filterField', () => {
    const api = makeApi({ filterField: 'filter[{prop}]' }, { 'filter[name]': 'a', keep: 1 })
    expect(itemParams(api)).toEqual({ keep: 1 })
  })

  it('returns all params when there is no pagination config', () => {
    expect(itemParams({ params: { a: 1 } })).toEqual({ a: 1 })
  })

  it('returns {} when the api has no params', () => {
    expect(itemParams({})).toEqual({})
    expect(itemParams(undefined)).toEqual({})
  })
})
