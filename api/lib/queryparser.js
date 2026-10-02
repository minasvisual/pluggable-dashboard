const operators = {
  and: true,
  or: true,
  lt: true,
  lte: true,
  gt: true,
  gte: true,
  ne: true,
  eq: true,
  not: true,
  between: true,
  notBetween: true,
  in: true,
  notIn: true,
  startsWith: false,
  endsWith: false,
  like: true,
  and: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('$and') : '$and',
      value: value.split(':')
    }
  },
  or: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('or') : '$or',
      value: value.split(':')
    }
  },
  lt: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('lt') : '$lt',
      value
    }
  },
  lte: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('lte') : '$lte',
      value
    }
  },
  gt: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('gt') : '$gt',
      value
    }
  },
  gte: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('gte') : '$gte',
      value
    }
  },
  ne: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('ne') : '$ne',
      value
    }
  },
  eq: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('eq') : '$eq',
      value
    }
  },
  not: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('not') : '$not',
      value
    }
  },
  between: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('between') : '$between',
      value: value.split(':')
    }
  },
  notBetween: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('notBetween') : '$notBetween',
      value: value.split(':')
    }
  },
  in: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('in') : '$in',
      value: value.split(':')
    }
  },
  notIn: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('notIn') : '$notIn',
      value: value.split(':')
    }
  },
  startsWith: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('startsWith') : '$startsWith',
      value
    }
  },
  endsWith: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('endsWith') : '$endsWith',
      value
    }
  },
  like: (symbolic, value) => {
    return {
      comparisonOp: symbolic ? Symbol.for('like') : '$like',
      value
    }
  },
};
//
//
//
const uniqBy = (arr, predicate) => {
  const cb = typeof predicate === 'function' ? predicate : (o) => o[predicate];

  return [...arr.reduce((map, item) => {
    const key = (item === null || item === undefined) ?
      item : cb(item);

    map.has(key) || map.set(key, item);

    return map;
  }, new Map()).values()];
};

const pickBy = (object) => {
  const obj = {};
  for (const key in object) {
      if (object[key] !== null && object[key] !== undefined) {
          obj[key] = object[key];
      }
  }
  return obj;
}

const uniq = (array) => {
  return [...new Set(array)];
}

const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && object.hasOwnProperty(key)) {
       obj[key] = object[key];
    }
    return obj;
  }, {});
}
//
//module.exports = { uniqBy, pickBy, uniq, pick };
//
const extractSort = ({ sort, basedProperties }) => {
  if (sort === '' || sort === undefined) return undefined;

  let sortClause = [];
  let properties = sort.split(',');

  if (basedProperties.length > 0) {
    properties =  properties.filter(property => basedProperties.includes(property.replace(/^-/, '')));
  }

  if (properties.length) { 
    properties = properties.length > 1 ? uniqBy(properties, item => item.replace(/^-/, '')) : properties;
    sortClause = properties.map(property => {
      if( property.includes('.') ){
        let [ as, prop ] = property.split('.')
        return prop.charAt(0) === '-' ? [as, prop.slice(1), 'DESC'] : [as, prop, 'ASC']
      }else
        return property.charAt(0) === '-' ? [property.slice(1), 'DESC'] : [property, 'ASC']
    });
  }

  return sortClause;
};

const extractValueType = (value) => {
  if( value == 'true' ) value = true
  if( value == 'false' ) value = false
  if( value == 'null' ) value = null
     
  return value
}

const extractWhere = ({ query, basedProperties, symbolic }) => {
  let { sort, offset, limit, select, filter, filters, ...others } = query;
  if (filters && (Object.keys(filters).length > 0)) filter = filters
  if (!filter || !(Object.keys(filter).length > 0)) return undefined;
  if( !Array.isArray(filter) ) filter = [filter]
  let whereClause = {};
  
  for (let property of filter) {
    if (property.includes(',')) {
      let [field, comparisonOp, value] = property.split(',');
       
      value = extractValueType(value)
      
      if (comparisonOp in operators) {
        let result = operators[comparisonOp](symbolic, value);
        
        if( field.includes(':') ){
          let joiner = operators['or'](symbolic, field);
          if( !whereClause[joiner.comparisonOp] ) whereClause[joiner.comparisonOp] = {} 
          
          for(let subfield of joiner.value){ 
            if( !whereClause[joiner.comparisonOp][subfield] ) whereClause[joiner.comparisonOp][subfield] = {}
            whereClause[joiner.comparisonOp][subfield][result.comparisonOp] = result.value;
          }
        }else{ 
          if( !whereClause[field] ) whereClause[field] = {}
          whereClause[field][result.comparisonOp] = result.value;
        }
      }
    } else {
      whereClause[property] = property;
    }
  } 
  return whereClause;
};

const extractInclude = ({ includes }) => {
    let include = []
    if( !includes ) return undefined;
    if( typeof includes === 'string'  )
        includes = [includes]
      
    for(let inc of includes ){
       if( typeof inc === 'string' && inc.includes(':') ){
          let [ association, attr, filter, limit, as, required=false ] = inc.split(':')
          
          let attributes = (attr && attr.split(',')) || undefined 
          let where = (filter && extractWhere({query:{filter}})) || undefined 
          required = ( typeof required === 'string' ? ( required === 'true' ) : undefined  ) 
         
          include.push(pickBy({ association, attributes, where, as: (as || association), required }))
       }else{
          include.push({association: inc, as: inc })
       }
    }
  
    return (include.length > 0 ? include : undefined)
}

const calculatePage = ({query = {}}) => {
   let { limit, page=1, offset } = query;
   page = parseInt(page, 10)
   if( page === 0 || page === null || page === undefined || (typeof page === 'number' && page < 1) ) page = 1;
  
   return ( limit ? (limit * (page-1)) : ( typeof offset === 'string' ? parseInt(offset) : offset ) );
}


module.exports = ({app}) => {
  
  const convert = ({ query, basedProperties = [], symbolic = false }) => {
    if (typeof query !== 'object') {
      throw new Error('Query must be object');
    }
    if( query.sort && query.sort.indexOf('-') < 0 && query.order && query.order.toLowerCase() == "desc" ) query.sort = `-${query.sort}`; 
    
    const criteria = {
      where: extractWhere({ query, basedProperties, symbolic }),
      order: extractSort({ sort: query.sort, basedProperties }),
      group: typeof query.group === 'string' ? query.group : undefined,
      offset: calculatePage({ query }),
      limit:  typeof query.limit === 'string' ? parseInt(query.limit) : query.limit,
      page:  (typeof query.page === 'string' ? parseInt(query.page) : query.page) < 1 ? 1 : query.page,
      attributes: typeof query.fields === 'string' && query.fields !== '' ? query.fields.split(',') : undefined,
      include: query.include  ? extractInclude({includes:query.include}) : undefined,
    };
    
    return pickBy(criteria);
  };
  
  const pagination = async (paginateData, query={}) => {
      let {limit, offset, page } = query;
      if( !paginateData || !paginateData.count ) return paginateData;
      if( paginateData && paginateData.count && !limit ) return paginateData.rows;
    
      let pages = Math.ceil( paginateData.count / limit );
      return { ...paginateData, pages };
  }

  return({ convert, pagination });
}