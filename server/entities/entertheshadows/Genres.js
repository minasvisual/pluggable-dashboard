/* jshint indent: 2 */

module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsGenres', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      hide:	DataTypes.BOOLEAN
    }, {
      tableName: 'genres',
      createdAt: 'createdAt',
      updatedAt: false,
      underscored: false,
      paranoid: false, 
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {
        Model.belongsToMany(models.EtsArtists, {
          through: models.EtsArtistGenres,
          as: 'artists',
          foreignKey: 'genre_id'
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
  