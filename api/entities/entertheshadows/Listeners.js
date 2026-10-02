/* jshint indent: 2 */

module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsListeners', { 
      date: {
        type: DataTypes.DATE, 
        allowNull: false,
        primaryKey: true,
      },
      listeners:	{
        type: DataTypes.JSON,
        defaultValue: () => ([])
      },
    }, {
      tableName: 'listeners',
      createdAt: false,
      updatedAt: false,
      underscored: false,
      paranoid: false, 
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {  
    }
    return Model;
  };
  