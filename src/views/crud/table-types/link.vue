<template>
    <a :href="cell.action.handler" :target="cell.action.target" v-html="replaceContent()"></a>
</template>
<script>
import { interpolate } from '../../../services/helpers'
export default {
    props:['data', 'cell', 'row'],
    methods: {
        replaceContent() {
            if( this.cell?.action?.label ) 
                return interpolate(this.cell.action.label, {data: this.data, action: this.cell.action, row: this.row  })
            else
                return this.data
        }
    }
}
</script>