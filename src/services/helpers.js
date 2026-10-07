import deepmerge from 'deepmerge'
import { has, sortBy, get, isNil, isObject, omit, isEqual, capitalize } from 'lodash'
import moment from 'moment'

// Each schema has exactly ONE auth mode (the most specific level wins: schema, then project):
//   'system' -> inherits the global (dash) auth: use_system_auth = true
//   'own'    -> has its own auth config (login, sessionStorage token)
//   'none'   -> no auth config at all
export const getAuthMode = (schema = {}, project = {}) => {
  let schemaAuth = get(schema, 'auth')
  if( schemaAuth === false ) return 'none'

  let flag = get(schema, 'use_system_auth', get(schemaAuth, 'use_system_auth'))
  if( !isNil(flag) ) return flag ? 'system' : 'own'
  if( schemaAuth ) return 'own'

  if( has(project, 'auth') ) return get(project, 'auth.use_system_auth', false) ? 'system' : 'own'
  return 'none'
}

export const sendType = (cell, row, data) => {
    if( cell?.action?.source == 'cell')
        return cell
    else if( cell?.action?.source == 'row')
        return { ...row, [cell.key]: data }
    else if( cell?.action?.source == 'field')
        return { [cell.key]: data }
    else if( cell?.action?.source == 'context')
        return mergeDeep(cell?.action?.data, { overwrite: {api:{ resource:row }}, row: get(row, cell?.action?.id, data) })
    else if( cell?.action?.source == 'custom')
        return cell?.action?.data
    else    
        return data
}

export const manualMerge = (objA = {}, objB) => {
    let newObj = { ...objA }
    Object.keys(objB).map( key => {
        if( Array.isArray(objB[key]) ){
        	if( newObj[key] && Array.isArray(newObj[key]) )
                newObj[key] = [ ...newObj[key], ...objB[key] ]
            else
                newObj[key] = objB[key]
        }else if( typeof objB[key] == 'object' ){
            newObj[key] = manualMerge(newObj[key], {...objB[key]})
        }else{
            newObj[key] = objB[key]

        }
    })
    console.log('level', objB, newObj)
    return newObj
}


export const objectDeepDiff = function(f,s) {
    if (f === s) return true;

    if (Array.isArray(f)&&Array.isArray(s)) {
        return isEqual(f.sort(), s.sort());
    }
    if (_.isObject(f)) {
        return isEqual(f, s);
    }
    return isEqual(f, s);
};

export const mergeAll = (arr) =>  deepmerge.all(arr)

export const mergeDeep  = (a = {}, b = {}) => {
    return deepmerge(a, b, {
        arrayMerge: (d, s) => {
            return [ ...d, ...s ]
        }
    })
}

export const getErrorMessage = (error) => {
    if(error){
        if( get(error, 'code', '') == "ECONNREFUSED" ){
            return error.message + "( " + get(error, 'config.url') + ")"
        }

        if( has(error, 'response.data.message') )
            return get(error, 'response.data.message')

        if( get(error, 'message') )
            return get(error, 'message')

        if( typeof error == 'string' )
            return error
    }
    return ""
}

export const formatModel = (columns=[], data) => {
    columns.map(i => {
        if( data[i.prop] && ['date'].includes(i.type) ){ 
            let format = ( i.type == 'date' ? 'YYYY-MM-DD': 'YYYY-MM-DD\\Thh:mm:ss' )
            data[i.prop] = formatDate(data[i.prop], format, null, true)
        } 
    })
    return data
}

export const formatOutput = (columns=[], data) => {
    console.debug('formatOutput', data)
    let extractdata = (col = {}, k) =>  {
        if( col.children && Array.isArray(col.children) )  col.children.map( i => extractdata(i, k))
        if( get(col, 'name', false) ){
            if( col.ignored && data[col.name] ) {
                console.debug('formatOutput ignored', col)
                data = omit(data, [col.name]) 
            }
        }
    }
    columns.map((col, k) => {
            extractdata(col, k)
    })
    console.debug('formatOutput out', data)
    return data
}

export const formatDate = function(value, format, from, utc=false) {
    if (value) {
      let date = moment(String(value), from)
      if(utc) date = date.utc()
      return date.format(format)
    }
}

export const interpolate = (string, scope, def) => {
    if( typeof string !== 'string' ) return string; 

    return string.replace(/\{([^}]*)}/g, (r,k) => get(scope, k, (def ? def:'{'+k+'}')) );
}

export const queryString = (params, join, data) => {
    let rtn = ''
    let arrQuery = []
    if( isObject(params) && Object.keys(params).length > 0 ){
        Object.keys(params).map(k => {
            if( Array.isArray(params[k]) )
                params[k].map(i => arrQuery.push([ interpolate(k, data), interpolate(i, data)]) )
            else
                arrQuery.push([interpolate(k, data), interpolate(params[k], data)])
        })

        rtn = join+new URLSearchParams( arrQuery )
    }
    return rtn
}

// query params that belong to the list request only (page, limit, sort, filter)
export const listParamKeys = (pagination = {}) => {
    const keys = ['pageField', 'limitField', 'sortField'].map(f => pagination[f]).filter(Boolean)
    const filterField = pagination.filterField
    // filterField may be a template like "filter[{prop}]": match every interpolated key
    const filterRe = filterField
        ? new RegExp('^' + filterField.split(/\{[^}]*}/).map(part => part.replace(/[.*+?^$()|[\]\\]/g, '\\$&')).join('.*') + '$')
        : null
    return { keys, filterRe }
}

// params for single record requests (get by id, save, delete): without the list state
export const itemParams = (api) => {
    let { params = {}, pagination = {} } = api || {}
    const { keys, filterRe } = listParamKeys(pagination)
    return Object.keys(params).reduce((acc, k) => {
        if( !keys.includes(k) && !(filterRe && filterRe.test(k)) ) acc[k] = params[k]
        return acc
    }, {})
}

export const filterParams = (api, queryInfo) => { 
    let { page, pageSize, sort, filters } = queryInfo || {}
    let { pagination = {} } = api || {}
    // never mutate the previous params: the schema is shared by the list and the record requests
    let params = { ...(get(api, 'params') || {}) }
    if( !isNil(page) && has(pagination, 'pageField') )
        params[ pagination.pageField || 'page' ] = page
    if( !isNil(pageSize) && has(pagination, 'limitField') )
        params[ pagination.limitField || 'limit'] = pageSize
    if( sort && !isNil(sort.prop) && !isNil(sort.order) && has(pagination, 'sortField') && has(pagination, 'sortExp') ){
        let dir = sort.order == 'ascending'? get(pagination,'sortAscChar','asc'): get(pagination, 'sortDescChar', 'desc')
        let pagData = {prop: sort.prop, sort: dir, order: dir}
        params[ pagination.sortField || 'order' ] = interpolate( get(pagination, 'sortExp', '{prop},{order}'), pagData)
    }

    // filters are only touched when the query carries them (page/size changes keep the current filter)
    if( Array.isArray(filters) && has(pagination, 'filterField') ){
        const active = filters.find(f => f && !isNil(f.prop) && !isNil(f.value) && f.value !== '')
        const filterField = interpolate( get(pagination, 'filterField', 'filter'), active || get(filters, '[0]', {}) )
        if( active && has(pagination, 'filterExp') )
            params[ filterField ] = interpolate( (pagination.filterExp || '{prop},like,%{value}%') , active)
        else
            delete params[ filterField ]
    }
 
    return {...api, params};
}

export const schemaColumns = (properties) => {
    let columns = [ { label: '', key: "selected", filter: false, sorter:false, sort: -1 } ]
    let extractdata = (col = {}, k) =>  {
        if( col.children && Array.isArray(col.children) )  col.children.map( i => extractdata(i, k))
        if( get(col, 'config.grid', false) )
            columns.push({
                sort: get(col, 'config.sort', k+1),
                key: get(col, 'name', col.id),
                label: get(col, 'config.label', capitalize((col.label || col.name))),
                type: get(col, 'config.type', (col.type || 'text')),
                action: Object.assign( get(col, 'config.action',{}), get(col, 'attributes', {}) ),
                options: get(col, 'options', {}),
                schema: get(col, 'schema', {}),
                sorter: get(col, 'config.sorter', true),
                filter: get(col, 'config.filter', true),
                _classes: get(col, 'config.classes'),
                _style: get(col, 'config.styles'),
            })
    }
    properties.map((col, k) => {
            extractdata(col, k)
    })

    columns.push({ label: '', key: 'actions', filter: false, sorter: false })

    return sortBy(columns, ['sort'])
}

export const getLocalStorage = (key, json=true) => {
    try{
        let ls = window.localStorage.getItem(key)
        if( ls ){
            if( json ) ls = JSON.parse(ls)
            return ls
        }
        return null
    }catch(e){
        console.log('getLocalStorage', e)
        return null
    }
}

export const setLocalStorage = (key, data, json=true) => {
    try{
        if( key ){
            if( json ) data = JSON.stringify(data)
            
            let ls = window.localStorage.setItem(key, data)
            return ls
        }
        return true
    }catch(e){
        console.log('setLocalStorage', e)
        return false
    }
}

export const saveSettings = (data) => {
    try{
        let settings = getLocalStorage('settings') || {}

        settings = { ...settings, ...data }

        setLocalStorage('settings', settings)

        return settings
    }catch(e){
        
        console.log('saveSettings', e)
    }
}

export const isRegex = (data, reg, custom=false) => {
    let rgs ={
        url: "^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.)"
    }
    if( !rgs[reg] && !custom ) return ;

    var regex = new RegExp( rgs[reg] || reg );

    console.debug('isRegex', rgs[reg], data, regex.test(data))
    return regex.test(data)
} 

/**
 * Creates a task queue that limits how many async tasks run at once.
 * concurrency = 1 makes them strictly sequential.
 */
export const createQueue = (concurrency = 1) => {
  let running = 0
  const pending = []

  const next = () => {
    if( running >= concurrency || !pending.length ) return
    const { task, resolve, reject } = pending.shift()
    running++
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => { running--; next() })
  }

  return (task) => new Promise((resolve, reject) => {
    pending.push({ task, resolve, reject })
    next()
  })
}

const requestQueue = createQueue(1)
const requestCache = new Map()

/**
 * Runs `task` through the shared sequential queue. Calls with the same `key` share
 * one promise (in flight or resolved) for `ttl` ms. Empty results and errors are not kept.
 */
export const queuedRequest = (key, task, ttl = 30000) => {
  const hit = requestCache.get(key)
  if( hit && Date.now() - hit.time < ttl ) return hit.promise

  const promise = requestQueue(task)
  const entry = { promise, time: Date.now() }
  requestCache.set(key, entry)

  const drop = () => { if( requestCache.get(key) === entry ) requestCache.delete(key) }
  promise.then(res => {
    const list = Array.isArray(res) ? res : (res && res.rows)
    if( !list || !list.length ) drop(); else entry.time = Date.now()
  }, drop)

  return promise
}
