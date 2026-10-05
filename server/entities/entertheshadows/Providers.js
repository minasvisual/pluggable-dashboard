/* jshint indent: 2 */
/* jshint indent: 2 */

module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsProviders', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: DataTypes.INTEGER(11),
      nickname: DataTypes.STRING(255),
      email:	DataTypes.STRING(255), 
      cover:	DataTypes.STRING(255),
      unsubscribed:	DataTypes.BOOLEAN,
    }, {
      tableName: 'accounts',
      createdAt: false,
      updatedAt: false,
      underscored: false,
      paranoid: false, 
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {
        Model.hasMany(models.EtsBlogs, {
          as: 'blogs',
          foreignKey: 'account_id'
        }); 
      
    }
    return Model;
  };
  
  