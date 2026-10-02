/* jshint indent: 2 */

module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsArtists', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      name:	DataTypes.STRING(255),	
      bio:	DataTypes.STRING(1024),	
      image: DataTypes.STRING(255),
      mbid:	DataTypes.STRING(255),
      ontour:	DataTypes.BOOLEAN,
      similar:	{
        type: DataTypes.STRING(255),
        defaultValue: '[]'
      },
      summary:	DataTypes.STRING(512),
      tags:	{
        type: DataTypes.STRING(255),
        defaultValue: '[]'
      },
      country:	DataTypes.STRING(255),
      city:	DataTypes.STRING(255),
      begin:	DataTypes.STRING(255),
      ended:	DataTypes.STRING(255),
      status:	{
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },    
      links:	{
        type: DataTypes.JSON,
        defaultValue: () => ({})
      },
      metadata:	{
        type: DataTypes.JSON,
        defaultValue: () => ({})
      },
      album_cron:	DataTypes.DATE,
      event_cron:	DataTypes.DATE,
      mbz_cron:	DataTypes.DATE,
    }, {
      tableName: 'artists',
      createdAt: 'createdAt',
      deletedAt: 'deletedAt',
      updatedAt: false,
      underscored: false,
      paranoid: false, 
      defaultScope:{  
          where: { status: true }
      },
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {
        Model.hasMany(models.EtsAlbums, {
          as: 'albums',
          foreignKey: 'artist_id',
        });   
        Model.hasMany(models.EtsArtistVideos, {
          as: 'videos',
          foreignKey: 'artist_id',
        });  
        Model.hasOne(models.EtsRating, {
          as: 'rate',
          foreignKey: 'artist_id',
        }); 
        Model.belongsToMany(models.EtsGenres, {
          through: models.EtsArtistGenres,
          as: 'genres',
          foreignKey: 'artist_id'
        });     
        Model.belongsToMany(models.EtsConcerts, {
          through: 'artists_events',
          as: 'events',
          foreignKey: 'artist_id'
        });  
        Model.belongsToMany(models.EtsBlogs, {
          through: 'artists_blogs',
          as: 'blogs',
          foreignKey: 'artist_id',
          required: false
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
  