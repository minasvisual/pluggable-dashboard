/* jshint indent: 2 */

module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsArtistVideos', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      artist_id: DataTypes.INTEGER(11),
      artist_name: DataTypes.STRING(255),
      title: { 
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      link: { 
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isUrl: true, 
        }
      },
      status:{
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    }, {
      tableName: 'artists_videos',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      underscored: false,
      paranoid: false,    
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {
        Model.belongsTo(models.EtsArtists, {
           as: 'artist',
           foreignKey: 'artist_id',
        })
    }
    return Model;
  };
  