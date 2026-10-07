import { get, has, round, isEqual } from 'lodash'
import { schemaColumns  } from './helpers'

export default {
    computed: {
      hasPagination(){
        return has(this.schema, 'api.pagination.pageField', false)
      },
      hasPageSize(){
        return has(this.schema, 'api.pagination.limitField', false)
      },
    },
    methods:{
      fetchQueryInfo(type, data){
        console.debug("fetch query info", type, data)
        this.queryInfo = { type }
        if( type == 'sort' ){
          this.queryInfo.sort = { prop: data.column, order: data.asc === true ? 'ascending':'descending' }
          this.queryInfo.page = 1
        }
        if( type == 'filter' ){
          this.queryInfo.filters = Object.keys(data).map((key) => ({ prop: key, value: data[key] }))
          this.queryInfo.page = 1
        }
        if( type == 'page' ){
          this.queryInfo.page = data
        }
        if( type == 'pageSize' ){
          this.queryInfo.pageSize = data
          this.queryInfo.page = 1
        }
        // any change of the result set goes back to the first page
        if( this.queryInfo.page === 1 && 'currentPage' in this ) this.currentPage = 1
        
        this.fetchData(this.queryInfo)
      },
      validateQueryInfo(queryInfo){
          if( !queryInfo || typeof queryInfo !== 'object' ) return false;
          
          if( ['sizeChange', 'pageSize', 'size', 'pageChange', 'sort', 'filter', 'page', 'init'].includes(queryInfo.type) ){
              if( queryInfo.type == 'filter' &&  !get(queryInfo, 'filters[0].prop')  )
                  return false;
          }else{
              return false;
          }

          return true
      },
      schemaColumns(properties){ 

          return schemaColumns(properties)
      },
      calcPages(totalRows, perPage){
          let count = (totalRows || 1) / perPage
          let rounded = round(count)
          return count > rounded ? rounded + 1 : rounded
      },
      isSelected(val) {
          return this.selectedRow.findIndex(i => isEqual(i, val) ) >= 0
      },
      selectionAll(){
          if( this.selectedRow.length == this.data.rows.length )
          this.selectedRow = []
          else
          this.selectedRow = this.data.rows
      },
      selectionChange(val, index) {
          let key = this.selectedRow.findIndex(i => isEqual(i, val) )
          if( key >= 0 )   
          this.selectedRow.splice(key, 1)
          else
          this.selectedRow.push(val)
      },
      optionfy(arr, label, key){
        return arr.map(i => ({ label: i[label], key: i[key] }) )
      },
      optionfyObject(arr, label, key){
        let obj = {}
        arr.map(i => obj[ i[key] ] = i[label]  )
        return obj
      },
      can(schema, attr){
        return get(schema, attr, true)
      }
    }
}