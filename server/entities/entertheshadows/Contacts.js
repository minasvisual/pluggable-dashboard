/* jshint indent: 2 */

module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsContacts', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      ip: DataTypes.STRING(255),
      name: DataTypes.STRING(255),
      email: DataTypes.STRING(255),
      message:	DataTypes.STRING(2048),
      attach:	DataTypes.STRING(512),
      subject:	DataTypes.STRING(255),
    }, {
      tableName: 'contacts',
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      underscored: true,
      paranoid: true, 
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {  
    }
    return Model;
  };
  