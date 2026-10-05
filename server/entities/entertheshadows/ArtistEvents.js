/* jshint indent: 2 */

module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsArtistEvents', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      artist_id: DataTypes.INTEGER(255),
      event_id: DataTypes.INTEGER(255),
    }, {
      tableName: 'artists_events',
      createdAt: 'createdAt',
      updatedAt: false,
      underscored: false,
      paranoid: false, 
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {
        Model.belongsTo(models.EtsArtists, {
           as: 'artist',
           foreignKey: 'artist_id',
        }) 
        Model.belongsTo(models.EtsConcerts, {
           as: 'event',
           foreignKey: 'event_id',
        })
       
    }
    return Model;
  };
  