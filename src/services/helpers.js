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

export const filterParams = (api, queryInfo) => { 
    let { page, pageSize, sort, filters } = queryInfo || {}
    let { params = {}, pagination = {} } = api || {}
    if( !isNil(page) && has(pagination, 'pageField') )
        params[ pagination.pageField || 'page' ] = page
    if( !isNil(pageSize) && has(pagination, 'limitField') )
        params[ pagination.limitField || 'limit'] = pageSize
    if( sort && !isNil(sort.prop) && !isNil(sort.order) && has(pagination, 'sortField') && has(pagination, 'sortExp') ){
        let pagData = {prop: sort.prop, sort: sort.order == 'ascending'? get(pagination,'sortAscChar','asc'): get(pagination, 'sortDescChar', 'desc')}
        params[ pagination.sortField || 'order' ] = interpolate( get(pagination, 'sortExp', '{prop},{order}'), pagData)
    }

    let filterField = interpolate( get(pagination, 'filterField', 'filter'), get(filters, '[0]', {}) )
    if( has(filters, '[0].prop') && has(filters, '[0].value') && has(pagination, 'filterField') && has(pagination, 'filterExp') )
        params[ filterField ] = interpolate( (pagination.filterExp || '{prop},like,%{value}%') , filters[0])
    else if( has(pagination, 'filterField') )
        delete params[ filterField ]
 
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