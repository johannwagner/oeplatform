let columnCount = 0;
let columnList = [];
let constraintCount = 0;
let constraintList = [];
let schema;

function removeColumn(columnId){
    columnList[columnId] = null;
    renderColumns();
}

function removeConstraint(constraintId){
    constraintList[constraintId] = null;
    renderColumns();
}

function addForeignKeyConstraint(){
    let selectedColumns = columnList.filter((column) => column && column.selected).map((column) => column.name);
    constraintCount++;

    let referenceSchemaName = document.getElementById('constraintSchemaName').value;
    let referenceTableName = document.getElementById('constraintTableName').value;
    let referenceColumnNames = document.getElementById('constraintColumnNames').value;

    constraintList.push({
        type:"ForeignKey",
        columns: selectedColumns,
        reference: {
            schemaName: referenceSchemaName,
            tableName: referenceTableName,
            columnNames: referenceColumnNames.replace(' ','').split(',')
        }
    });


    $('.addConstraintClear').val('');

    columnList.forEach((column) => {
        if(column)
            column.selected = false;
    });
    renderColumns();
}

function setSchema(_schema) {
    console.log('Set Schema', _schema);
    schema = _schema;
}

function addUniqueConstraint(){
    let selectedColumns = columnList.filter((column) => column && column.selected).map((column) => column.name);
    constraintCount++;

    constraintList.push({
        type:"Unique",
        columns: selectedColumns
    });

    columnList.forEach((column) => {
        if(column)
            column.selected = false;
    });
    renderColumns();
}

function lengthVisibility(columnCount) {

    let typeValue = document.getElementById('columnType').value;

    let typeLengthList = ['LargeBinary', 'String', 'Text', 'Unicode', 'UnicodeText'];

    if (typeLengthList.includes(typeValue)) {
        document.getElementById('columnLengthDiv').style.display = "inline"
    } else {
        document.getElementById('columnLengthDiv').style.display = "none"
    }

}

function addColumn() {
    columnCount++;

    console.log('Add Column to Overview.');

    // columnName, columnLength, columnType, columnNotNull

    let columnNameElement = document.getElementById('columnName');
    let columnLengthElement = document.getElementById('columnLength');
    let columnTypeElement = document.getElementById('columnType');
    let columnNotNullElement = document.getElementById('columnNotNull');

    let columnObj = {
        name: columnNameElement.value,
        length: columnLengthElement.value,
        type: columnTypeElement.value,
        notnull: columnNotNullElement.value,
        selected: false
    };

    columnList[columnCount] = columnObj;


    $('.addColumnClear').val('');

    renderColumns();

}

function getReferenceDescription(referenceDescription){
    if(referenceDescription){
        let str = [];
        referenceDescription.columnNames.forEach((columnName) => {
            str.push(referenceDescription.schemaName + "." + referenceDescription.tableName + "." + columnName);
        })

        return str.join(', ');
    } else {
        return '';
    }

}

function renderColumns() {

    let tableName = document.getElementById('tableName');
    let columnRows = document.getElementById('tableRows');
    let constraintRows = document.getElementById('tableRowsConstraints');

    let columnRowsHTML = '';
    let constraintRowsHTML = '';

    document.getElementById('submitButton').disabled = !(columnList.length > 0 && tableName)

    let backgroundColor = 'style="background-color: lightgreen;"';

    columnList.forEach((column, index) => {
        if(column){
          columnRowsHTML += `
        <tr ${column.selected ? backgroundColor : null} id="trId${index}" onclick="rowSelection(${index})">
            <td> ${column.name}</td>
            <td> ${column.type}</td>
            <td> ${column.length}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="removeColumn(${index}); return false;">Remove</button>
            </td>  
        </tr>`;
        }

    });

    constraintList.forEach((constraint, index) => {
        if(constraint){
            constraintRowsHTML += `
        <tr id="trIdC${index}">
            <td>${constraint.type}</td>
            <td>${constraint.columns.join(', ')}</td>
            <td>${getReferenceDescription(constraint.reference)}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="removeConstraint(${index})">Remove</button>
            </td>            
        </tr>`
        }

    });

    columnRows.innerHTML = columnRowsHTML;
    constraintRows.innerHTML = constraintRowsHTML;
}

function rowSelection(trId) {
    if(columnList[trId].selected){
        columnList[trId].selected = false;
    } else {
        columnList[trId].selected = true;
    }

    renderColumns();
}

function nameCheck(inputName, divName) {

    let disableDiv = document.getElementById(divName);
    let inputNameValue = document.getElementById(inputName).value;


    // TODO: Verify.

    let regExpTableNamePattern = /^[a-z_]+$/g;
    let isGood = regExpTableNamePattern.test(inputNameValue);

    console.log('Checked Name. isGood: ' + isGood);
    disableDiv.style.display = isGood ? 'none': 'block';

}

function pushToServer(){
    // We push against public rest API.


    let constraints = [];
    let columns = [];

    let schemaName = schema;
    let tableName = document.getElementById('tableName').value;

    columnList.forEach((column) => {
        let columnData = {
            name: column.name,
            data_type: column.type,
            character_maximum_length: column.length,
            is_nullable: !column.notnull
        };

        columns.push(columnData);
    });

    constraintList.forEach((constraint) => {

        if(constraint.columns.length > 1) {
            /**
             * API is not able to handle multi column constraints.
             */
            throw Error('Not supported.');
        }

        if (constraint.type === "Unique"){
            constraints.push({
                constraint_type: "UNIQUE",
                constraint_name: `unique_${schemaName}_${tableName}_${constraint.columns.join('_')}`,
                constraint_parameter: constraint.columns.join(', ')
            });
        } else if(constraint.type === "ForeignKey") {
            constraints.push({
                constraint_type: "FOREIGN KEY",
                constraint_name: `fkey_${schemaName}_${tableName}_${constraint.columns.join('_')}`,
                constraint_parameter: constraint.columns.join(', '),
                reference_table: constraint.reference.schemaName + '.' + constraint.reference.tableName,
                reference_column: constraint.reference.columnNames.join(', ')
            })
        }

    }
    )
    debugger;
    $.ajax({
        type: 'PUT',
        url: `/api/v0/schema/${schemaName}/tables/${tableName}/`,
        data: JSON.stringify({
            columns,
            constraints
        }), // or JSON.stringify ({name: 'jonas'}),
        success: function(data) { alert('data: ' + data); },
        contentType: "application/json",
        dataType: 'json'
    });



    /*
    {
      "constraints": [
        {
          "constraint_type": "FOREIGN KEY",
          "constraint_name": "fkey_schema_table_database_id",
          "constraint_parameter": "database_id",
          "reference_table": "example.table",
          "reference_column": "database_id_ref"
        },
        {
          "constraint_type": "PRIMARY KEY",
          "constraint_name": "pkey_schema_table_id",
          "constraint_parameter": "id",
          "reference_table": null,
          "reference_column": null
        }
      ],
      "columns": [
        {
          "name": "id",
          "data_type": "int",
          "is_nullable": "YES",
          "character_maximum_length": null
        },
        {
          "name": "name",
          "data_type": "character varying",
          "is_nullable": "NO",
          "character_maximum_length": 50
        }
      ]
    }

    */

}



$('#tableName').on('input', function() {
    console.log('KeyUp Fired.');
    nameCheck('tableName', 'tableNameGuidelines');
});
console.log('Init finished.');

