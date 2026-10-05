/* jshint indent: 2 */

module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsAlbums', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      artist_id:{
        type: DataTypes.INTEGER(11),
        field: 'artist_id'
      },
      title: {
        type: DataTypes.STRING(255),
        unique: true
      },
      cover:	DataTypes.STRING(255),
      release:	DataTypes.DATE,
      tracks:	DataTypes.INTEGER(11),
      tag:	DataTypes.STRING(255),
      status: DataTypes.BOOLEAN
    }, {
      tableName: 'artists_albums',
      createdAt: 'created_at',
      updatedAt: false,
      underscored: true,
      paranoid: false, 
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {
        Model.belongsTo(models.EtsArtists, {
          as: 'artist'
        }); 
      
        // Model.afterCreate( async (instance) => {
        //   let qr =  await sequelize.query("SELECT @eid := id, @link := link, @city := city, @date := initdate  FROM events_dev WHERE id = "+instance.id+"; "+
        //                                   "DELETE FROM events_dev WHERE link = @link and city = @city and initdate = @date and id <> @eid;", 
        //                                   { type: sequelize.QueryTypes.SELECT }
        //                   )
          
        //   models.Logs.create({ user_id: 1, level: 'log', url: 'nightfy/events/batch-delete', data: qr})
        // })
    }
    return Model;
  };
  