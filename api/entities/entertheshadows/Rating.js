/* jshint indent: 2 */

module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsRating', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      artist_id: DataTypes.INTEGER(11),
      like: DataTypes.INTEGER(11),
      dislike:	DataTypes.INTEGER(11)
    }, {
      tableName: 'artists_rate',
      createdAt: false,
      updatedAt: false,
      underscored: false,
      paranoid: false, 
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {
        Model.belongsTo(models.EtsArtists, {
          as: 'artist',
          foreignKey: 'artist_id'
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
  