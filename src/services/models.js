import { get, set, has, isNil, isEmpty, capitalize } from 'lodash'
import { setup } from 'axios-cache-adapter'
import { interpolate, queryString } from './helpers'
import Store from '../store'

// Create `axios-cache-adapter` instance
const api = setup({
  maxAge: 1 * ( 60 * 60 ), // N x 1 minute
  ignoreCache: process.env.VUE_APP_ENV === 'local', 
  clearOnStale: true,
  exclude: {
    // Only exclude PUT, PATCH and DELETE methods from cache
    methods: ['put', 'patch', 'delete']
  }
})

api.interceptors.request.use(
  function (config) {

    // if( !config.headers[( process.env.VUE_APP_LOGIN_TOKEN_HEADER || 'access-token')] ){
    //   const token = localStorage.getItem('dash_session')
    //   if (process.env.VUE_APP_LOGIN == 'true' && token) {
    //     let headerName = ( process.env.VUE_APP_LOGIN_TOKEN_HEADER || 'access-token')
    //     let headerValue = interpolate(( process.env.VUE_APP_LOGIN_TOKEN_HEADER_EXPRESSION || '{token}'), {token})
    //     config.headers[ headerName ] = headerValue;
    //   }
    // }

    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
)

api.interceptors.response.use(
  (success) => {
    return success
  },
  (error) => { 
    Store.dispatch("requestFail", error)
    
   // return Error object with Promise
   return Promise.reject(error);
  },
  function (error) {
    return Promise.reject(error);
  }
)

export const getUserData = async (opts = { method: 'GET' }) => {
  return request( process.env.VUE_APP_LOGGED_URL , opts )
}

export const getAuthHeaders = (project, token) => {
  let tokenRequest = get(project, 'request_token_expression', '{token}')
  let headers = process.env.VUE_APP_DEFAULT_HEADERS ? JSON.parse(process.env.VUE_APP_DEFAULT_HEADERS) : {}
  if( get(project, 'request_mode', 'header') == 'query' )
    return { 
      params:{
          [get(project, 'request_token', 'access-token')] : interpolate(tokenRequest, {token})
      },
      headers
    } 
  else if( get(project, 'request_mode', 'header') == 'header' )
    return { 
      headers:{
        ...headers,
        [get(project, 'request_token', 'access-token')] : interpolate(tokenRequest, {token})
      }
    } 
  else if( process.env.VUE_APP_LOGIN == 'true' )
    return getAuthHeaders({ 
      "request_mode": process.env.VUE_APP_LOGIN_TOKEN_MODE || 'header',
      "request_token": process.env.VUE_APP_LOGIN_TOKEN_HEADER || 'access-token',
      "request_token_expression": process.env.VUE_APP_LOGIN_TOKEN_HEADER_EXPRESSION || '{token}', 
    }, token) 
  else
    return {
      headers
    }
  
}

export const request = (query, options={}, config = {}) => {
  let { wrap=true, session } = config
  
  if( session !== false && process.env.VUE_APP_LOGIN == 'true' ){
    const token = localStorage.getItem('dash_session')
    let headerName = ( process.env.VUE_APP_LOGIN_TOKEN_HEADER || 'access-token')
    if ( !has(options, `headers[${headerName}]`) && token ) { 
      let headerValue = interpolate(( process.env.VUE_APP_LOGIN_TOKEN_HEADER_EXPRESSION || '{token}'), {token})
      set(options, `headers[${headerName}]`, headerValue);
    }
  }

  return api({ url: query,  ...options }).then((res) => {
    console.debug('Cached request', res.request.fromCache !== true)
    return wrap ? res.data: res 
  })
}

export const loadModel = async (url, options) => {
   return await request(url, options).then( res => {
      console.log("loadModel "+url, res)
      if( !res.api ) throw { message: "Model Load error" }

      return res
   })
}

export const loadProjects = async (opts) => {

   return await request(process.env.VUE_APP_DATABASE, opts)
      
}

export const getData = async (model, data={}, config={}) => { 
  let { api = {} } = model;
  if( api.resource && isEmpty(data.data) ) data.data = api.resource

  let url = ''
  let isRow = has(data, `[${model.primaryKey || 'id'}]`) || model.type == 'form'
  let options = {
    method: ( isRow ? ( isNil(api.methodGetById) ? 'GET':api.methodGetById) : (isNil(api.methodGet) ? 'GET':api.methodGet) ),
    ...config
  } 
  let sessionConfig = {
    session: model.auth 
  }

  let query = queryString(api.params, ( api.rootApi.includes('?') ? '&':'?'), data)

  if( isRow )
    url = `${api.rootApi}${ isNil(api.urlGetById) ? '/{id}{query}': api.urlGetById }`
  else
    url = `${api.rootApi}${ isNil(api.urlGet) ? '{query}': api.urlGet }`

  if( api.headers )
    options['headers'] = api.headers

  if( api.body )
    options['data'] = api.body
  
  url = interpolate(url, {...data, query })
  
  console.debug('get data', url, options, sessionConfig)
  return request(url, options, sessionConfig)
      .then( data => {  
        if( isRow ){
          return ( !isNil(api.wrapDataById) ? get(data, api.wrapDataById, data): data)
        }else{
          let rows = ( !isNil(api.wrapData) ? get(data, api.wrapData, data): data)
          let total = ( !isNil(api.totalData) ? get(data, api.totalData, rows.length): rows.length )

          if( !Array.isArray(rows) ) rows = [rows]
          if( typeof total !== 'number' ) total = rows.length

          return {
            rows,
            total
          }
        }
      })
}

export const getDataObject = async (model, data={}, config={}) => { 
  let { api = {} } = model;
  if( api.resource && isEmpty(data.data) ) data.data = api.resource

  let url = ''
  let options = {
    method:  isNil(api.methodGet) ? 'GET': api.methodGet,
    ...config
  } 
  let sessionConfig = {
    session: model.auth
  }

  let query = queryString(api.params, ( api.rootApi.includes('?') ? '&':'?'), data)
 
  url = `${api.rootApi}${ isNil(api.urlGet) ? '{query}':api.urlGet }`

  if( api.headers )
    options['headers'] = api.headers

  if( api.body )
    options['data'] = api.body
  
  url = interpolate(url, {...data, query })
  
  console.debug('get data object', url, options, sessionConfig)
  return request(url, options, sessionConfig)
      .then( data => {   
        return ( !isNil(api.wrapData) ? get(data, api.wrapData, data): data) 
      })
}

export const saveData = async (model, data, config={}) => { 
  let { api = {} } = model; 
  let resource = api.resource || {}
  let url = ''
  let primaryKey = (isNil(model.primaryKey) ? 'id':model.primaryKey)
  let method = data[primaryKey] ? (isNil(api.methodPatch) ? "PUT":api.methodPatch) : (isNil(api.methodPost) ? "POST":api.methodPost);
  let query = interpolate( 
    queryString(api.params, (api.rootApi.includes('?') ? '&':'?')),  
    { ...data, data: resource }
  )
  let sessionConfig = {
    session: model.auth
  }
 
  if( has(data, primaryKey) )
    url = `${api.rootApi}${ isNil(api.urlPatch) ? '/{id}':api.urlPatch }`
  else
    url = `${api.rootApi}${ isNil(api.urlPost) ? '': api.urlPost}`

  console.log("saveData interpolate date", url, {...data, query}, api.resource)
  url = interpolate(url, {...data, query, data: resource})

  let options = {
    method,
    data,
    ...config
  }
  if( api.headers )
    options['headers'] = api.headers
  
  return request(url, options, sessionConfig)
}

export const deleteData = async (model, data, config={}) => {
  let { api } = model;
  if( api.resource && isEmpty(data.data) ) data.data = api.resource
  
  let primaryKey = (model.primaryKey || 'id')

  if( !has(data, primaryKey) ) return Promise.reject('Id not found')

  let sessionConfig = {
    session: model.auth
  }
  
  let method = ( isNil(api.methodDelete) ? "DELETE":api.methodDelete )
  let query = interpolate( 
    queryString(api.params, (api.rootApi.includes('?') ? '&':'?')),  
    data
  )
  let url = `${api.rootApi}${ isNil(api.urlDelete) ? '/{id}':api.urlDelete }`
    
  url = interpolate(url, {...data, query})

  let options = {
    method,
    ...config
  }
  if( api.headers )
    options['headers'] = api.headers
  
  return request(url, options, sessionConfig)
}

