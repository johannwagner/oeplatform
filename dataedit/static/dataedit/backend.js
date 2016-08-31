var OEP = {};

// backwards compatability for use in Recline
var recline = recline || {};
recline.Backend = recline.Backend || {};
recline.Backend.OEP = OEP;


/*

string (text): a string
number (double, float, numeric): a number including floating point numbers.
integer (int): an integer.
date: a date. The preferred format is YYYY-MM-DD.
time: a time without a date
date-time (datetime, timestamp): a date-time. It is recommended this be in ISO 8601 format of YYYY-MM- DDThh:mm:ssZ in UTC time.
boolean (bool)
binary: base64 representation of binary data.
geo_point: as per http://www.elasticsearch.org/guide/reference/mapping/geo-point-type.html. That is a field (in these examples named location) that has one of the following structures:
geojson: as per http://geojson.org/
array: an array
object (json): an object
any: value of field may be any type
*/

var typemap = {
    BIGINT: 'integer',
    BINARY: 'binary',
    BLOB: 'binary',
    BOOLEAN: 'boolean',
    BigInteger: 'integer',
    Boolean: 'boolean',
    CHAR: 'boolean',
    CLOB: 'binary',
    Concatenable: 'any',
    DATE: 'date',
    DATETIME: 'date-time',
    DECIMAL: 'number',
    Date: 'date',
    DateTime: 'date-time',
    Enum: 'any',
    FLOAT: 'number',
    Float: 'number',
    INT: 'integer',
    INTEGER: 'integer',
    Integer: 'integer',
    Interval: 'any',
    LargeBinary: 'binary',
    MatchType: 'any',
    NCHAR: 'string',
    NVARCHAR: 'string',
    Numeric: 'number',
    PickleType: 'any',
    REAL: 'number',
    SMALLINT: 'integer',
    SchemaType: 'any',
    SmallInteger: 'integer',
    String: 'string',
    TEXT: 'string',
    TIME: 'time',
    TIMESTAMP: 'date-time',
    Text: 'string',
    Time: 'time',
    TypeDecorator: 'any',
    TypeEnginBases: 'any',
    TypeEngine: 'any',
    Unicode: 'string',
    VARBINARY: 'binary',
    VARCHAR: 'string',
}


function grid_formatter(value, field, row){
    if(value==null)
        return "";
    if(field.id=='_comment')
    {
        if(value._id== null)
            return '';
        var el = document.createElement('div');
        el.innerHTML = ('<div id="modal' + value._id + '" class="modal fade" role="dialog">'
              + '<div class="modal-dialog">'
                + '<div class="modal-content">'
                  + '<div class="modal-header">'
                    + '<button type="button" class="close" data-dismiss="modal">&times;</button>'
                    + '<h4 class="modal-title">Comment</h4>'
                  + '</div>'
                  + '<div class="modal-body">'
                    + '<p> Method: '+ value.method +'</p>'
                    + '<p> Origin: '+ value.origin +'</p>'
                    + '<p> Assumption: '+ value.assumption +'</p>'
                  + '</div>'
                  + '<div class="modal-footer">'
                    + '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>'
                  + '</div>'
                + '</div>'

              + '</div>'
            + '</div>');
        document.body.appendChild(el);
        return '<a data-toggle="modal" data-target="#modal' + value._id + '"><span class="glyphicon glyphicon-info-sign"></span></a>';
    }
    if(field.id=='ref_id')
    {
        var ret = '<a href="/literature/entry/' + value + '">' + value + '</a>';
        return ret
    }
    return value;
}



var table_fields = [];
var pk_fields = [];


(function($, my) {
    my.__type__ = 'OEP-Backend'; // e.g. elasticsearch
    my.max_rows = 1000;
    // Initial load of dataset including initial set of records
    my.fetch = function(dataset){
        var query = {table: dataset.table, schema: dataset.schema}
        var request = $.when($.ajax({url:"/api/get_columns/", data: {'query':JSON.stringify(query)}, dataType:'json', type: "POST"}),
                             $.ajax({type: 'POST', url:'/api/get_pk_constraint', dataType:'json', data: {query: JSON.stringify(query)}}));
        var dfd = new $.Deferred();

        function construct_field(el){
            var type;
            if(el.type in typemap)
                type=typemap[el.type];
            else
                type=el.type;
            var field = new recline.Model.Field({
                id: el.name,
                format: grid_formatter,
                type:type,

              });
              if(el.name == '_comment'){
                field.editor = buildCommentEditor(dataset.schema, dataset.table);
              }
              field.renderer = grid_formatter;
              return field;
        }

        request.done(function(results, pks) {
            if (results.error) {
                dfd.reject(results.error);
            }
            pks = pks[0];
            results = results[0];
            table_fields = results.content.map(construct_field);
            pk_fields = pks.content.constrained_columns;
            dfd.resolve({
                fields: table_fields,
                useMemoryStore: false,
            });
        });
        request.fail(function( jqXHR, textStatus ) {
            alert( "Request failed: " + textStatus );
        });

        return dfd.promise()
    };

    // Query the backend for records returning them in bulk.
    // This method will be used by the Dataset.query method to search the backend
    // for records, retrieving the results in bulk.
    my.query = function(queryObj, dataset){
        console.log(queryObj.from + " - " + queryObj.size)
        var query = {};
        var table_query = {
                    type:'table',
                    schema: dataset.schema,
                    table: dataset.table
        };
        var field_query;
        if(dataset.has_row_comments){
        field_query = table_fields.concat([
            {id:'method', attributes:{type:'text'}},
            {id:'origin', attributes:{type:'text'}},
            {id:'assumption', attributes:{type:'text'}}]).map(get_field_query);
        }
        else
            field_query = table_fields.map(get_field_query)
        var id = null;

        if(pk_fields){
            id = pk_fields[0]
        }
        if(dataset.has_row_comments){
            if(!unchecked){
                table_query.only = true;
            }
            query.from = [{
                type: 'join',
                left: table_query,
                right:{
                    type:'table',
                    schema: '_' + dataset.schema,
                    table: '_' + dataset.table +'_cor'
                },
                join_type: 'left join',
                on: {
                    type: 'operator_binary',
                    left: {
                        type: 'column',
                        column: '_comment'
                    },
                    operator: '=',
                    right: {
                        type: 'column',
                        column: '_id'
                    }
                }
            }];
        }
        else
        {
            query.from = [table_query];
        }


        if(query.limit > my.max_rows){
            query.limit = my.max_rows
            alert("You can fetch at most " + my.max_rows + " rows in a single request. Your request will be truncated!")
        }



        if(queryObj.fields){
            query.fields = fields.map(function (el){
                        return {
                                type: 'column',
                                column: el
                        }
                ;})
        }
        else{
            query.fields = field_query;
        }

        var count_query= $.extend(true, {}, query);
        count_query.fields = [{
            type:'function',
            function:'count',
            operands: [{type:'star'}]
            }]


        query.limit = queryObj.size;
        query.offset = queryObj.from;

        if (id != null)
            query.order_by = [{
                type:'column',
                column: id}];

        var request = $.when(
            $.ajax({type: 'POST', url:'/api/search', dataType:'json', data: {query: JSON.stringify(query)}}),
            $.ajax({type: 'POST', url:'/api/search', dataType:'json', data: {query: JSON.stringify(count_query)}})
        )
        var dfd = new $.Deferred();
        request.done(function(results, counts) {
            results = results[0];
            counts = counts[0];
            if (results.error) {
                dfd.reject(results.error);
            }

            else
            {
                var response = {
                    hits: results.content.data.map(function(raw_row){
                        var row = {};
                        for(i=0; i<raw_row.length; ++i)
                        {
                            var key = results.content.description[i][0];
                            row[key] = raw_row[i];
                        }
                        if(dataset.has_row_comments){
                            row['_comment']={
                                _id: row['_comment'],
                                origin: row['origin'],
                                method: row['method'],
                                assumption: row['assumption']
                            };
                        }
                        return row;
                    }),
                    total: counts.content.data[0][0],
                }
                dfd.resolve(response);
            }
        });

        request.fail(function( jqXHR, textStatus ) {
            alert( "Request failed: " + textStatus );
        });

        return dfd.promise()
    };

    my.save = function(changes, dataset){
        var dfd = new $.Deferred();
        var request = $.when(
                changes.creates.map(
                    insert_query(
                        dataset.attributes.schema,
                        dataset.attributes.table,
                        $("#commit-message").val()
                    )
                )
            ).then(
                changes.updates.map(
                    update_query(
                        dataset.attributes.schema,
                        dataset.attributes.table,
                        $("#commit-message").val()
                    )
                )
            );

        // We do not know the number of updates. Thus we set no arguments and
        // obtain them via black magic called javascript
        request.done(function()
        {
            for (var i=0; i<arguments.length; i++)
                if(arguments[i].error)
                    dfd.reject(arguments[i].error);
            dfd.resolve({})
        });

        request.fail(function( jqXHR, textStatus ) {
            alert( "Request failed: " + textStatus );
        });
    };

    function insert_query(schema, table, message)
    {
        return function(record){

            debugger;
            var query = {
                schema: schema,
                table: table,
                values: record.additions
            }

            query['message'] = message

            return $.ajax({type: 'POST',
                url:'/api/insert', dataType:'json',
                data: {
                    query: JSON.stringify(query)
                }
            });
        }
    };


    function update_query(schema, table, message)
    {
        return function(record){

            var conditions = [];
            for(var col in record._previousAttributes){
                if ($.inArray(col, ['method', 'origin', 'assumption', '_id']) == -1)
                    conditions.push(condition_query(col,record._previousAttributes[col]));
            }
            var query = {
                schema: schema,
                table: table,
                where: conditions,
                values: record.changed
            }

            query['message'] = message

            return $.ajax({type: 'POST',
                url:'/api/update', dataType:'json',
                data: {
                    query: JSON.stringify(query)
                }
            });
        }
    };


}(jQuery, OEP));

